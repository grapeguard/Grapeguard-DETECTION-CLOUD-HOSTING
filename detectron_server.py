# Correct Detectron2 Server - Matches Your Training Setup
# detectron_server.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import cv2
import numpy as np
import base64
import io
from PIL import Image
import time
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Import detectron2 with your custom path
try:
    import detectron2.detectron2
    from detectron2.detectron2.engine import DefaultPredictor
    from detectron2.detectron2.config import get_cfg
    from detectron2.detectron2.utils.visualizer import Visualizer, ColorMode
    from detectron2.detectron2.data import MetadataCatalog
    from detectron2.detectron2 import model_zoo
    DETECTRON2_AVAILABLE = True
    logger.info("✅ Detectron2 imported successfully")
except ImportError as e:
    logger.error(f"❌ Detectron2 import failed: {e}")
    DETECTRON2_AVAILABLE = False

class GrapeDiseaseDetector:
    def __init__(self, model_path, threshold=0.5):
        self.model_path = model_path
        self.threshold = threshold
        self.predictor = None
        self.detectron2_loaded = False
        
        # EXACT same classes as your training
        self.class_names = [
            "Karpa (Anthracnose)",          # Class 0
            "Bhuri (Powdery mildew)",       # Class 1  
            "Bokadlela (Borer Infestation)", # Class 2
            "Davnya (Downey Mildew)",       # Class 3
            "Healthy"                       # Class 4
        ]
        
        # Colors for visualization (RGB format)
        self.colors = [
            [255, 0, 0],    # Red for Anthracnose
            [255, 165, 0],  # Orange for Powdery Mildew
            [139, 0, 0],    # Dark Red for Borer
            [255, 0, 255],  # Magenta for Downy Mildew
            [0, 255, 0]     # Green for Healthy
        ]
        
        logger.info(f"🔧 Model path: {model_path}")
        logger.info(f"🎯 Detection threshold: {threshold}")
        logger.info(f"🏷️ Classes: {self.class_names}")
        
    def create_config_like_training(self):
        """Create config identical to your training setup"""
        try:
            cfg = get_cfg()
            
            # EXACT same config as your training
            cfg.merge_from_file("detectron2/configs/COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml")
            
            # Your trained model weights
            cfg.MODEL.WEIGHTS = self.model_path
            
            # Same settings as training
            cfg.MODEL.ROI_HEADS.NUM_CLASSES = 5
            cfg.MODEL.ROI_HEADS.BATCH_SIZE_PER_IMAGE = 128
            cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = self.threshold
            
            # Device settings
            cfg.MODEL.DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
            
            # Data settings (not needed for inference but keeping consistent)
            cfg.DATALOADER.NUM_WORKERS = 0  # Set to 0 for inference
            
            logger.info("✅ Config created matching your training setup")
            return cfg, True
            
        except Exception as e:
            logger.error(f"❌ Config creation failed: {e}")
            
            # Fallback: try to load config file directly from detectron2 folder
            try:
                # Try alternative path
                alt_config_path = os.path.join("detectron2", "detectron2", "configs", "COCO-InstanceSegmentation", "mask_rcnn_R_50_FPN_3x.yaml")
                if os.path.exists(alt_config_path):
                    cfg.merge_from_file(alt_config_path)
                    logger.info("✅ Loaded config from alternative path")
                else:
                    # Manual config setup
                    cfg.MODEL.META_ARCHITECTURE = "GeneralizedRCNN"
                    cfg.MODEL.BACKBONE.NAME = "build_resnet_fpn_backbone"
                    cfg.MODEL.RESNETS.DEPTH = 50
                    cfg.MODEL.RESNETS.OUT_FEATURES = ["res2", "res3", "res4", "res5"]
                    cfg.MODEL.FPN.IN_FEATURES = ["res2", "res3", "res4", "res5"]
                    cfg.MODEL.ANCHOR_GENERATOR.SIZES = [[32], [64], [128], [256], [512]]
                    cfg.MODEL.ANCHOR_GENERATOR.ASPECT_RATIOS = [[0.5, 1.0, 2.0]]
                    cfg.MODEL.RPN.IN_FEATURES = ["p2", "p3", "p4", "p5", "p6"]
                    cfg.MODEL.ROI_HEADS.NAME = "StandardROIHeads"
                    cfg.MODEL.ROI_HEADS.IN_FEATURES = ["p2", "p3", "p4", "p5"]
                    cfg.INPUT.MIN_SIZE_TRAIN = (800,)
                    cfg.INPUT.MAX_SIZE_TRAIN = 1333
                    cfg.INPUT.MIN_SIZE_TEST = 800
                    cfg.INPUT.MAX_SIZE_TEST = 1333
                    logger.info("✅ Manual config setup completed")
                
                cfg.MODEL.WEIGHTS = self.model_path
                cfg.MODEL.ROI_HEADS.NUM_CLASSES = 5
                cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = self.threshold
                cfg.MODEL.DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
                
                return cfg, True
                
            except Exception as e2:
                logger.error(f"❌ Fallback config also failed: {e2}")
                return None, False
    
    def load_model(self):
        """Load your trained model with correct config"""
        if not DETECTRON2_AVAILABLE:
            logger.error("❌ Detectron2 not available")
            return False
            
        if not os.path.exists(self.model_path):
            logger.error(f"❌ Model file not found: {self.model_path}")
            return False
            
        try:
            logger.info("🔥 LOADING YOUR TRAINED MODEL...")
            
            # Create config matching your training
            cfg, success = self.create_config_like_training()
            if not success:
                logger.error("❌ Failed to create config")
                return False
            
            # Register metadata exactly like your training
            dataset_name = "leaf_disease_dataset"
            MetadataCatalog.get(dataset_name).thing_classes = self.class_names
            MetadataCatalog.get(dataset_name).thing_colors = self.colors
            
            logger.info(f"✅ Metadata registered for dataset: {dataset_name}")
            logger.info(f"📋 Classes: {self.class_names}")
            
            # Create predictor
            logger.info("🚀 Creating predictor with your trained weights...")
            self.predictor = DefaultPredictor(cfg)
            self.cfg = cfg
            
            # Test the model
            logger.info("🧪 Testing your model...")
            test_image = np.ones((800, 800, 3), dtype=np.uint8) * 128  # Test with larger image
            outputs = self.predictor(test_image)
            
            logger.info(f"✅ MODEL TEST SUCCESSFUL!")
            logger.info(f"🎯 Test output instances: {len(outputs['instances'])}")
            logger.info(f"📊 Available output fields: {list(outputs.keys())}")
            logger.info(f"🔧 Instance fields: {outputs['instances'].get_fields().keys()}")
            
            self.detectron2_loaded = True
            logger.info("🎉 YOUR TRAINED MODEL IS READY!")
            return True
            
        except Exception as e:
            logger.error(f"💥 MODEL LOADING FAILED: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return False
    
    def base64_to_image(self, base64_string):
        """Convert base64 to OpenCV image"""
        try:
            image_data = base64.b64decode(base64_string)
            pil_image = Image.open(io.BytesIO(image_data))
            
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            return opencv_image
        except Exception as e:
            logger.error(f"❌ Image conversion failed: {str(e)}")
            return None
    
    def image_to_base64(self, image):
        """Convert OpenCV image to base64"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_image)
            
            buffer = io.BytesIO()
            pil_image.save(buffer, format='JPEG', quality=90)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/jpeg;base64,{img_str}"
        except Exception as e:
            logger.error(f"❌ Image to base64 conversion failed: {str(e)}")
            return None
    
    def predict(self, image, include_visualization=True):
        """Make prediction using your trained model"""
        if not self.detectron2_loaded:
            return {
                "predictions": [],
                "visualization": None,
                "error": "Your trained model is not loaded",
                "model_info": {"architecture": "MODEL NOT LOADED"}
            }
        
        start_time = time.time()
        
        try:
            logger.info("🔬 Running prediction with YOUR trained model...")
            
            # Get predictions from your model
            outputs = self.predictor(image)
            instances = outputs["instances"]
            
            logger.info(f"🎯 Raw model output: {len(instances)} instances detected")
            
            detections = []
            if len(instances) > 0:
                scores = instances.scores.cpu().numpy()
                classes = instances.pred_classes.cpu().numpy()
                boxes = instances.pred_boxes.tensor.cpu().numpy()
                
                logger.info(f"📋 Detailed detections:")
                for i in range(len(scores)):
                    class_id = int(classes[i])  # 0-4 from your model
                    confidence = float(scores[i])
                    bbox = boxes[i].tolist()
                    
                    logger.info(f"   Detection {i+1}:")
                    logger.info(f"     Class ID: {class_id}")
                    logger.info(f"     Class Name: {self.class_names[class_id]}")
                    logger.info(f"     Confidence: {confidence:.3f}")
                    logger.info(f"     BBox: {bbox}")
                    
                    detections.append({
                        "class_id": class_id + 1,  # Convert 0-4 to 1-5 for frontend
                        "class_name": self.class_names[class_id],
                        "confidence": confidence,
                        "bbox": bbox
                    })
            else:
                logger.info("📭 No detections found above threshold")
            
            # Create COLORED visualization
            visualization_image = None
            if include_visualization:
                try:
                    metadata = MetadataCatalog.get("leaf_disease_dataset")
                    visualizer = Visualizer(
                        image[:, :, ::-1],  # Convert BGR to RGB for visualizer
                        metadata=metadata,
                        scale=1.0,
                        instance_mode=ColorMode.IMAGE  # Use IMAGE for colored masks, not IMAGE_BW
                    )
                    
                    vis_output = visualizer.draw_instance_predictions(instances.to("cpu"))
                    vis_image = vis_output.get_image()[:, :, ::-1]  # Convert RGB back to BGR
                    visualization_image = self.image_to_base64(vis_image)
                    
                    logger.info("✅ COLORED visualization created successfully")
                    
                except Exception as vis_error:
                    logger.error(f"❌ Visualization creation failed: {vis_error}")
                    visualization_image = None
            
            processing_time = time.time() - start_time
            
            result = {
                "predictions": detections,
                "visualization": visualization_image,
                "image_info": {
                    "height": image.shape[0],
                    "width": image.shape[1],
                    "channels": image.shape[2],
                    "size": f"{image.shape[1]}x{image.shape[0]}"
                },
                "processing_time": round(processing_time, 3),
                "model_info": {
                    "architecture": "YOUR TRAINED MASK R-CNN (ResNet-50)",
                    "device": self.cfg.MODEL.DEVICE,
                    "num_classes": 5,
                    "threshold": self.threshold,
                    "config": "mask_rcnn_R_50_FPN_3x.yaml",
                    "training_matched": True
                }
            }
            
            logger.info(f"🎉 PREDICTION COMPLETE!")
            logger.info(f"   Total detections: {len(detections)}")
            logger.info(f"   Processing time: {processing_time:.3f}s")
            logger.info(f"   Visualization: {'Created' if visualization_image else 'Failed'}")
            
            return result
            
        except Exception as e:
            logger.error(f"💥 PREDICTION FAILED: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            return {
                "predictions": [],
                "visualization": None,
                "error": f"Prediction failed: {str(e)}",
                "model_info": {
                    "architecture": "YOUR TRAINED MODEL - PREDICTION FAILED",
                    "error": str(e)
                }
            }

# Initialize detector
MODEL_PATH = os.getenv('DETECTRON_MODEL_PATH', './model_final.pth')
THRESHOLD = float(os.getenv('DETECTRON_THRESHOLD', '0.5'))

detector = GrapeDiseaseDetector(MODEL_PATH, THRESHOLD)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy" if detector.detectron2_loaded else "model_not_loaded",
        "detectron2_available": DETECTRON2_AVAILABLE,
        "detectron2_loaded": detector.detectron2_loaded,
        "model_exists": os.path.exists(detector.model_path),
        "model_path": detector.model_path,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "classes": detector.class_names,
        "threshold": detector.threshold,
        "config_used": "mask_rcnn_R_50_FPN_3x.yaml (matching training)"
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Prediction endpoint using YOUR trained model"""
    try:
        if not detector.detectron2_loaded:
            return jsonify({
                "error": "Your trained model is not loaded. Check server logs.",
                "status": "model_not_available"
            }), 500
        
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        image = detector.base64_to_image(data['image'])
        if image is None:
            return jsonify({"error": "Invalid image data"}), 400
        
        include_visualization = data.get('include_visualization', True)
        result = detector.predict(image, include_visualization)
        
        result['request_id'] = data.get('request_id', None)
        result['timestamp'] = time.time()
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Prediction endpoint error: {str(e)}")
        return jsonify({
            "error": str(e),
            "type": "prediction_error"
        }), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get information about your trained model"""
    return jsonify({
        "model_path": detector.model_path,
        "model_exists": os.path.exists(detector.model_path),
        "threshold": detector.threshold,
        "classes": detector.class_names,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "detectron2_loaded": detector.detectron2_loaded,
        "architecture": "Mask R-CNN with ResNet-50 FPN",
        "config_file": "mask_rcnn_R_50_FPN_3x.yaml",
        "training_info": {
            "num_classes": 5,
            "batch_size_per_image": 128,
            "max_iter": 80000,
            "base_lr": 0.00025
        },
        "note": "Config matches your training setup exactly"
    })

if __name__ == '__main__':
    logger.info("🚀 STARTING GRAPE DISEASE DETECTION WITH YOUR TRAINED MODEL")
    logger.info("🎯 Config will match your training setup exactly")
    
    if not os.path.exists(MODEL_PATH):
        logger.error(f"❌ Model file not found: {MODEL_PATH}")
        logger.info("💡 Please ensure model_final.pth is in the correct location")
        exit(1)
    
    success = detector.load_model()
    
    if success:
        logger.info("🎉 YOUR TRAINED MODEL IS READY!")
        logger.info("🎨 Colored mask visualization enabled")
        logger.info("🔬 Using exact same config as your training")
    else:
        logger.error("💥 YOUR MODEL FAILED TO LOAD!")
        logger.info("📋 Check the error logs above for details")
    
    logger.info("🌐 Starting server at http://localhost:5000")
    logger.info(f"🏷️ Classes: {', '.join(detector.class_names)}")
    
    app.run(host='0.0.0.0', port=5000, debug=True)