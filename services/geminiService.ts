import { GoogleGenAI, Modality } from "@google/genai";
import { Character } from '../types';

// 1. Check for the VITE_ prefixed key
if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable is not set");
}

// 2. Access the key using the VITE syntax (import.meta.env)
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const getStyleInstruction = (style: string): string => {
  switch (style) {
    case 'Cyberpunk':
      return 'Generate the image in a vibrant, high-contrast cyberpunk style with neon lights, futuristic cityscapes, and cybernetic elements.';
    case 'Anime':
      return 'Generate the image in a classic 90s anime style, with detailed hand-drawn aesthetics, film grain, and expressive characters.';
    case 'Watercolor Painting':
      return 'Generate the image as a beautiful watercolor painting with soft edges, blended colors, and a textured paper look.';
    case 'Cinematic':
      return 'Generate the image in a cinematic style with dramatic lighting, a shallow depth of field, and a widescreen aspect ratio feel. The colors should be rich and moody.';
    case 'Glitch Art':
      return 'Generate the image in a glitch art style, with digital artifacts, scan lines, color aberrations, and a distorted, chaotic aesthetic.';
    case 'Pop Surrealism':
      return 'Generate the image in a Pop Surrealism (or Lowbrow) style, featuring cartoonish, big-eyed figures in a whimsical or bizarre, dream-like setting. The colors should be vibrant and saturated.';
    case 'Art Deco Revival':
      return 'Generate the image in an elegant Art Deco Revival style, characterized by bold geometric patterns, symmetrical designs, rich colors, and a glamorous, vintage 1920s feel.';
    case 'Abstract Data Art':
      return 'Generate the image in an Abstract Data Art style, using algorithms and data visualization principles to create complex, geometric, and colorful compositions.';
    case 'Kinetic Art':
      return 'Generate the image in a Kinetic Art style, creating a sense of movement, vibration, or optical illusion through patterns, lines, and composition.';
    case 'ASCII Art Overlay':
      return 'Generate the image with a creative ASCII art overlay. The underlying image should be clear, but with a stylized layer of text characters forming the visual details.';
    case 'Synesthesia Art':
      return 'Generate the image in a Synesthesia Art style, translating abstract concepts or emotions into a vibrant explosion of interconnected colors, shapes, and textures.';
    case 'Sumi-e Art':
      return 'Generate the image in a traditional Japanese Sumi-e (ink wash) style, emphasizing minimalist beauty, flowing brushstrokes, and a monochromatic palette with subtle gradients.';
    case 'Low Poly 3D':
      return 'Generate the image in a Low Poly 3D style, featuring a faceted, geometric look as if constructed from a 3D mesh with flat-shaded polygons. Colors should be clean and vibrant.';
    case 'Default':
    default:
      return 'Generate the image in a consistent, high-quality cartoon style.';
  }
}

export const generateImage = async (
  prompt: string,
  referenceCharacters: Character[],
  aspectRatio: string,
  imageStyle: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';
    const selectedCharacters = referenceCharacters.filter(c => c.selected && c.image);

    const characterDefinitions = selectedCharacters
      .map(c => c.name)
      .join(', ');
    
    const styleInstruction = getStyleInstruction(imageStyle);
    
    const fullPrompt = `
      [SYSTEM CONFIGURATION]
      MANDATORY ASPECT RATIO: ${aspectRatio}
      - The final output image MUST strictly adhere to the ${aspectRatio} aspect ratio.
      - If the generated content does not fit, EXTEND the background (outpaint) to fill the ratio. Do not crop important details.

      You are an AI assistant creating a set of story images with consistent characters.
      Reference the following characters: ${characterDefinitions || 'the character(s) described'}.
      
      Scene Prompt: "${prompt}"

      Style instructions:
      - ${styleInstruction}
      - Ensure the characters look the same as in the provided reference images.
      - The image must be in 4K resolution and highly detailed.
    `;

    const imageParts = selectedCharacters.map(c => ({
      inlineData: {
        data: c.image!,
        mimeType: c.mimeType!,
      },
    }));

    // For character generation, prompt usually comes first or is interleaved.
    const parts: any[] = [
      { text: fullPrompt },
      ...imageParts,
    ];

    // Supported aspect ratios by the API
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const generationConfig: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (validRatios.includes(aspectRatio)) {
      generationConfig.imageConfig = { aspectRatio: aspectRatio };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: generationConfig,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    throw new Error("Failed to generate image. Please check the console for details.");
  }
};

export const generateItemSwap = async (
  prompt: string,
  baseImage: { base64: string; mimeType: string },
  itemImage: { base64: string; mimeType: string },
  aspectRatio: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';

    const fullPrompt = `
      [SYSTEM CONFIGURATION]
      MANDATORY ASPECT RATIO: ${aspectRatio}
      - The final output image MUST strictly adhere to the ${aspectRatio} aspect ratio.

      TASK: Generative Fashion Integration.
      
      INPUTS:
      - IMAGE 1 (First image): Model/Person (Mannequin).
      - IMAGE 2 (Second image): Clothing/Item (Apparel).

      INSTRUCTION:
      ${prompt}
      
      Generate a single photorealistic image of the person from IMAGE 1, but wearing the item/clothing from IMAGE 2.
      
      GUIDELINES:
      - Maintain the pose, body shape, and the background scene of IMAGE 1 exactly.
      - Drape the item from IMAGE 2 naturally over the person.
      - Adapt the lighting of the item to match the scene in IMAGE 1.
      
      OUTPUT: A SINGLE, high-quality composite image.
    `;

    const parts: any[] = [
      {
        inlineData: {
          data: baseImage.base64,
          mimeType: baseImage.mimeType,
        }
      },
      {
        inlineData: {
          data: itemImage.base64,
          mimeType: itemImage.mimeType,
        }
      },
      { text: fullPrompt }
    ];

    // Supported aspect ratios by the API
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const generationConfig: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (validRatios.includes(aspectRatio)) {
      generationConfig.imageConfig = { aspectRatio: aspectRatio };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: generationConfig,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error generating swap image with Gemini:", error);
    throw new Error("Failed to generate image. Please check the console for details.");
  }
};

export const generateFaceSwap = async (
  baseImage: { base64: string; mimeType: string },
  faceImage: { base64: string; mimeType: string },
  aspectRatio: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';

    const fullPrompt = `
      [SYSTEM CONFIGURATION]
      MANDATORY ASPECT RATIO: ${aspectRatio}
      
      TASK: ABSOLUTE FACE REPLACEMENT
      
      INPUTS:
      - IMAGE 1 (First Image): The TARGET Scene. Keep body, pose, hair, clothes, and background.
      - IMAGE 2 (Second Image): The SOURCE Face. Use this identity.
      
      INSTRUCTION:
      You are an expert digital editor. Your task is to replacing the face of the person in IMAGE 1 with the face of the person in IMAGE 2.
      
      EXECUTION RULES:
      1. OVERWRITE IDENTITY: The facial features (eyes, nose, mouth, eyebrows, jaw structure) in the output MUST match IMAGE 2.
      2. FORBIDDEN: Do NOT output the original face from IMAGE 1. The identity must change.
      3. INTEGRATION: Map the face from IMAGE 2 onto the head angle and lighting conditions of IMAGE 1.
      4. PRESERVATION: Do not change the hair style, hair color, ears, neck, clothing, or background of IMAGE 1.
      
      If the resulting face looks like the person in IMAGE 1, you have failed. 
      The resulting face MUST look like the person in IMAGE 2.
    `;

    // Important: Text Prompt FIRST, then Images. This forces the model to read instructions before processing the visual data.
    const parts: any[] = [
      { text: fullPrompt },
      {
        inlineData: {
          data: baseImage.base64,
          mimeType: baseImage.mimeType,
        }
      },
      {
        inlineData: {
          data: faceImage.base64,
          mimeType: faceImage.mimeType,
        }
      }
    ];

    // Supported aspect ratios by the API
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const generationConfig: any = {
      responseModalities: [Modality.IMAGE],
    };

    if (validRatios.includes(aspectRatio)) {
      generationConfig.imageConfig = { aspectRatio: aspectRatio };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: generationConfig,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error generating face swap with Gemini:", error);
    throw new Error("Failed to generate image. Please check the console for details.");
  }
};

export const removeImageBackground = async (
  image: { base64: string; mimeType: string }
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';

    const fullPrompt = `
      [SYSTEM CONFIGURATION]
      TASK: Background Removal.
      
      INPUT: One reference image.
      
      INSTRUCTION:
      Identify the main subject in the provided image. Generate a new image containing ONLY that subject.
      
      RULES:
      1. The background MUST be perfectly plain white (#FFFFFF).
      2. The subject must remain EXACTLY as they appear in the source image (same pose, lighting, details).
      3. Do not add any new elements.
      4. Do not crop the subject.
      
      OUTPUT: A high-quality image of the isolated subject on a white background.
    `;

    const parts: any[] = [
      {
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        }
      },
      { text: fullPrompt }
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error removing background with Gemini:", error);
    throw new Error("Failed to remove background. Please check the console for details.");
  }
};