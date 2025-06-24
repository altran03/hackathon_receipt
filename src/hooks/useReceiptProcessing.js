import { useState, useEffect } from 'react';

// Check if API key is available
// const googleCloudVisionApiKey = process.env.REACT_APP_GOOGLE_CLOUD_VISION_API_KEY;
// console.log('Google Cloud Vision API Key available:', !!googleCloudVisionApiKey);
// if (googleCloudVisionApiKey) {
//   console.log('API Key (first 10 chars):', googleCloudVisionApiKey.substring(0, 10) + '...');
// }

// Utility to resize and compress image before upload
async function resizeImage(file, maxWidth = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Replace GoogleCloudVisionService usage with a function that calls /api/vision
async function extractTextFromImageViaApi(imageFile) {
  // Compress and resize image before base64 conversion
  const compressedBlob = await resizeImage(imageFile, 1000, 0.7);
  const compressedFile = new File([compressedBlob], imageFile.name, { type: 'image/jpeg' });
  // Convert compressed image file to base64
  const base64Image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(compressedFile);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
  console.log('Base64 image length:', base64Image.length);
  const response = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64Image })
  });
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return data.responses?.[0]?.fullTextAnnotation?.text || '';
  } else {
    const text = await response.text();
    throw new Error(text);
  }
}

export const useReceiptProcessing = (addSpendingItem, onBudgetRefresh = null, categories = [], onReceiptProcessed) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrText, setOcrText] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Clean up the object URL when the component unmounts or the file changes
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setOcrText(null);
    setStructuredData(null);
    setError(null);
  };

  const handleCapture = (file) => {
    setSelectedFile(file);
    setOcrText(null);
    setStructuredData(null);
    setError(null);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setOcrText(null);
    setStructuredData(null);
    setError(null);
  };

  const processReceipt = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setOcrText(null);
    setStructuredData(null);
    setError(null);
    
    try {
      // Step 1: OCR Processing using Google Cloud Vision API
      const text = await extractTextFromImageViaApi(selectedFile);
      setOcrText(text);

      // Log the extracted text to the console
      console.log("--- Extracted OCR Text ---");
      console.log(text);
      console.log("--------------------------");
      
      const categoryNames = categories.map(c => c.name).join('", "');

      // Step 2: AI Analysis for itemization
      const msgResponse = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048, // Increased tokens for longer receipts
          messages: [{
            role: "user",
            content: `From the following receipt text, extract the store name, the final total, and a list of all items. For each item, provide its description, price, and classify it into one of the available categories.

Please return ONLY a valid JSON object. Do not include any other text, explanations, or markdown formatting.

The JSON object must have these keys: "storeName", "total", "items".
The "items" key must hold an array of objects, where each object has "description", "price", and "category" keys.
- The "description" should be a short, clean name for the item.
- The "price" must be a number (e.g., 12.99).
- The "category" must be one of the provided category names.
- Explicitly look for a "Tax" or "Sales Tax" line item and classify it under the "Tax" category.

If a value cannot be found, use null. For item categorization, use "Other" if no other category fits.

Available Categories:
"${categoryNames}"

Receipt Text:
${text}`
          }],
        })
      });

      // Parse the AI response as JSON
      let aiResponse = await msgResponse.json();
      let textContent = aiResponse.content?.[0]?.text;
      console.log("AI text content:", textContent);
      let jsonData;
      try {
        jsonData = JSON.parse(textContent);
      } catch (parseError) {
        console.error("The AI returned the following text which could not be parsed as JSON:", textContent);
        throw new Error("Could not parse the structured data from the AI's response.");
      }
      setStructuredData(jsonData);

      let newReceiptItems = [];
      // Step 3: Update Database with itemized spending
      if (jsonData.items && Array.isArray(jsonData.items)) {
        for (const item of jsonData.items) {
          if (item.category && item.price) {
            const amount = parseFloat(String(item.price).replace(/[^0-9.-]+/g, ""));
            
            if (isNaN(amount)) {
              console.warn(`Invalid amount for item "${item.description}": ${item.price}`);
              continue; // Skip invalid items
            }

            const categoryName = item.category.replace(/^"|"$/g, '').trim();
            await addSpendingItem({
              categoryName,
              amount,
              itemName: item.description || 'Scanned Item'
            });
            newReceiptItems.push({ categoryName, amount, itemName: item.description || 'Scanned Item' });
          }
        }
        
        // Call the callback with all new items
        if (onReceiptProcessed && newReceiptItems.length > 0) {
          onReceiptProcessed(newReceiptItems);
        }
        
        // Refresh budgets if callback is provided
        if (onBudgetRefresh) {
          await onBudgetRefresh();
        }
      } else {
        throw new Error("AI response did not include a valid 'items' array.");
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    selectedFile,
    previewUrl,
    ocrText,
    structuredData,
    isExtracting,
    error,
    handleFileSelect,
    handleCapture,
    handleCancel,
    processReceipt,
    setError
  };
}; 