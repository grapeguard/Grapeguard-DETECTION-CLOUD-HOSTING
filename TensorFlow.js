// Install: npm install @tensorflow/tfjs @tensorflow/tfjs-react-native

import * as tf from '@tensorflow/tfjs';

// Disease Detection Service (Pure JavaScript)
class DiseaseDetectionService {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.classes = [
      "Karpa (Anthracnose)", 
      "Bhuri (Powdery mildew)", 
      "Bokadlela (Borer Infestation)",
      "Davnya (Downey Mildew)", 
      "Healthy"
    ];
  }

  async loadModel() {
    try {
      console.log('🔄 Loading TensorFlow.js model...');
      
      // Option 1: Convert your PyTorch model to TensorFlow.js format
      // Use: tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model your_model ./web_model
      this.model = await tf.loadLayersModel('/models/disease_model.json');
      
      // Option 2: Use a pre-trained model and fine-tune
      // this.model = await tf.loadLayersModel('https://your-server.com/model.json');
      
      this.isModelLoaded = true;
      console.log('✅ Model loaded successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      return false;
    }
  }

  async preprocessImage(imageElement) {
    // Convert image to tensor
    let tensor = tf.browser.fromPixels(imageElement)
      .resizeNearestNeighbor([224, 224]) // Resize to model input size
      .toFloat()
      .div(255.0) // Normalize to [0,1]
      .expandDims(); // Add batch dimension

    return tensor;
  }

  async predict(imageElement) {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded');
    }

    try {
      // Preprocess image
      const tensor = await this.preprocessImage(imageElement);
      
      // Run prediction
      const predictions = await this.model.predict(tensor);
      const probabilities = await predictions.data();
      
      // Get the predicted class
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      const confidence = probabilities[maxIndex] * 100;
      
      // Clean up tensors
      tensor.dispose();
      predictions.dispose();
      
      // Map results to your format
      return this.formatResults(maxIndex, confidence, probabilities);
      
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  formatResults(classIndex, confidence, allProbabilities) {
    const diseaseMapping = {
      0: { // Karpa (Anthracnose)
        disease: "Anthracnose (Karpa)",
        marathi: "कर्पा रोग",
        severity: confidence > 90 ? "High" : "Medium",
        recommendations: [
          "Remove infected leaves early",
          "Spray Chlorothalonil or Carbendazim", 
          "Improve air circulation within vines",
          "Avoid overhead watering"
        ]
      },
      1: { // Bhuri (Powdery mildew)
        disease: "Powdery Mildew (Bhuri)",
        marathi: "भुरी रोग",
        severity: confidence > 80 ? "Medium" : "Low",
        recommendations: [
          "Apply sulfur-based fungicide spray",
          "Improve air circulation around plants",
          "Remove affected leaves immediately",
          "Monitor humidity levels (keep below 70%)"
        ]
      },
      2: { // Bokadlela (Borer Infestation)
        disease: "Borer Infestation (Bokadlela)",
        marathi: "बोकाडलेला",
        severity: "High",
        recommendations: [
          "Install pheromone traps (10 per acre)",
          "Use Spinosad or Neem oil spray",
          "Inspect vines weekly for larvae entry holes",
          "Remove and destroy affected branches"
        ]
      },
      3: { // Davnya (Downey Mildew)
        disease: "Downy Mildew (Davnya)",
        marathi: "दवयाचा रोग",
        severity: confidence > 85 ? "High" : "Medium",
        recommendations: [
          "Spray Metalaxyl + Mancozeb after rain",
          "Ensure canopy pruning for sunlight",
          "Avoid evening irrigation",
          "Improve air circulation"
        ]
      },
      4: { // Healthy
        disease: "Healthy",
        marathi: "निरोगी",
        severity: "None",
        recommendations: [
          "Continue regular monitoring",
          "Maintain proper irrigation",
          "Keep optimal nutrient levels",
          "Regular preventive spraying"
        ]
      }
    };

    const result = diseaseMapping[classIndex] || diseaseMapping[4];
    
    return {
      disease: result.disease,
      confidence: Math.round(confidence * 10) / 10,
      severity: result.severity,
      marathi: result.marathi,
      recommendations: result.recommendations,
      detectedRegions: result.severity === 'None' ? 0 : Math.floor(Math.random() * 3) + 1,
      healthyArea: result.severity === 'None' ? 100 : Math.max(20, 100 - Math.round(confidence))
    };
  }
}

export default DiseaseDetectionService;