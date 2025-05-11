from transformers import pipeline
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Configure CORS to allow requests from any origin
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = 'uploads'
TRACKING_FILE = 'product_tracking.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize tracking data
def load_tracking_data():
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE, 'r') as f:
            return json.load(f)
    return {"products": []}

def save_tracking_data(data):
    with open(TRACKING_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def cleanup_old_data():
    data = load_tracking_data()
    one_week_ago = datetime.now() - timedelta(days=7)
    data["products"] = [
        product for product in data["products"]
        if datetime.fromisoformat(product["timestamp"]) > one_week_ago
    ]
    save_tracking_data(data)

llm = ChatGroq(
    model="llama-3.3-70b-versatile",            #llama is built by meta ("llm model ")
    groq_api_key="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",     #groq cloud it uses LPU
    temperature=0.0,
    max_retries=2,
    # other params...
)

# Initialize the captioner once
captioner = pipeline("image-to-text", model="Salesforce/blip-image-captioning-base")   #product details by this model 

prompt_extract = PromptTemplate.from_template("""
### Given the following product description, analyze the materials and estimated carbon footprint. Return a JSON object with:
- product: the product name or a short description
- material: the main material(s) used in the product
- a rating from 1 to 5 (where 1 is high carbon footprint and unsustainable, and 5 is low carbon footprint and highly sustainable),
- a brief justification,
- and 2 to 3 sustainable alternative product suggestions (if applicable), each with a short reason why they are better.

Respond in this format only:
{{
  "product": "<product name or description>",
  "material": "<main material(s)>",
  "rating": <number from 1 to 5>,
  "justification": "<short explanation>",
  "alternatives": [
    {{
      "name": "<alternative product name>",
      "reason": "<why it is more sustainable>"
    }}
  ]
}}

Product description:
{product_description}
""")

chain_extract = prompt_extract | llm    #pipeline operator 

@app.route('/analyze', methods=['GET', 'POST'])
def analyze_product():
    try:
        logger.info("Received request for product analysis")
        if request.method == 'POST' and 'image' in request.files:
            image = request.files['image']
            filename = secure_filename(image.filename)
            image_path = os.path.join(UPLOAD_FOLDER, filename)
            image.save(image_path)
            logger.info(f"Saved uploaded image to {image_path}")
        else:
            # Fallback to a default image if no upload
            image_path = r"C:\Users\lenovo\Downloads\TRI_CODE\TRI_CODE\uploads\photorealistic-water-bottle_23-2151049030.avif"
        # Analyze the image
        logger.info("Analyzing image...")
        page_content = captioner(image_path)[0]['generated_text']       #it gives you product details which is generatedd by salesforce model 
        logger.info(f"Image analysis result: {page_content}")
        
        # Get the analysis
        logger.info("Getting product analysis...")
        res = chain_extract.invoke({"product_description": page_content})
        analysis_data = eval(res.content)
        logger.info(f"Analysis result: {analysis_data}")
        
        # Add timestamp to the analysis data
        analysis_data['timestamp'] = datetime.now().isoformat()

        # Save to tracking data
        tracking_data = load_tracking_data()
        tracking_data["products"].append(analysis_data)
        save_tracking_data(tracking_data)
        
        # Cleanup old data
        cleanup_old_data()
        
        # Optionally, remove the uploaded image after processing
        if request.method == 'POST' and 'image' in request.files:
            os.remove(image_path)
        return jsonify(analysis_data)
    except Exception as e:
        logger.error(f"Error in analyze_product: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/tracking', methods=['GET'])
def get_tracking_data():
    try:
        # Cleanup old data before returning
        cleanup_old_data()
        return jsonify(load_tracking_data())
    except Exception as e:
        logger.error(f"Error in get_tracking_data: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(port=5000, debug=True)  # Added debug=True for better error messages png



