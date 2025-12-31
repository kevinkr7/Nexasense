# NexaSense  
**AI-Driven Platform for Structured Content Interpretation and Learning Facilitation**

---

## 📖 Overview
NexaSense is an AI-powered web application that transforms unstructured study materials into **structured, interactive study packs**.  
Students can upload handwritten notes or digital documents, and the platform intelligently generates:
- Concise **bullet-point summaries**
- **Interactive mind-maps** for visual learning
- **Relevant YouTube resources**
- Auto-generated **quizzes** for self-assessment

NexaSense is designed to reduce cognitive load, improve retention, and provide a **personalized learning experience** tailored to individual study preferences.

---

## 🚀 Features
- 📄 **Smart Summarization** – Convert notes into simplified bullet points  
- 🧩 **Mind-Map Generator** – Visualize topics and relationships interactively  
- 🎥 **YouTube Integration** – Auto-suggest relevant tutorial videos  
- 🎯 **Dynamic Quiz Generator** – Practice with AI-generated MCQs & short answers  
- 🎨 **Learning Style Adaptation** – Text, visual, or audio summaries  
- 🤝 **Collaborative Mode** – Merge multiple students’ notes into one study pack  
- 📤 **Export Options** – Download as PDF, PNG, or JSON  

---

## 🛠️ Tech Stack
- **Frontend**: React + Vite + Tailwind CSS (UI built with shadcn components)  
- **Backend**: Flask / FastAPI (for AI and OCR APIs)  
- **AI/ML**: Hugging Face Transformers (summarization), Tesseract / Google Vision (OCR), spaCy/KeyBERT (keyword extraction)  
- **Visualization**: D3.js / Cytoscape.js (mind-maps)  
- **Database**: Firebase / MongoDB  
- **APIs**: YouTube Data API, TTS API  

---

## 📂 Project Structure
nexa-study-craft-main/
├── public/ # Static assets
├── src/
│ ├── components/ # Reusable UI components
│ ├── pages/ # Application pages (Landing, Dashboard, Upload, Results)
│ ├── lib/ # API helpers and utilities
│ ├── assets/ # Images, icons
│ └── App.tsx # Entry point
├── package.json # Dependencies and scripts
├── README.md # Project documentation

---

## ⚡ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/kevinkr7/nexasense.git
cd nexasense
2. Install dependencies
npm install

3. Run development server
npm run dev


Visit http://localhost:5173
 in your browser.

4. Build for production
npm run build
npm run preview

📊 Demo Workflow

Upload Notes – Upload scanned handwritten notes or digital files (PDF/DOC/TXT).

Processing – OCR + NLP pipeline extracts text and generates structured summary.

Visualization – Interactive mind-map is created from keywords and concepts.

Resource Enrichment – YouTube tutorials and quizzes are added.

Learning Pack – User explores adaptive summaries, videos, and quizzes in one place.

🧑‍🤝‍🧑 Team Members

[Kevin K R] – Frontend & UI/UX

[Lakshmi Priya S] – Backend & AI Integration

[Mukesh Kumar S] – Visualization & API Integrations

🎯 Objectives

To create an intelligent platform that simplifies and visualizes study materials.

To personalize the learning experience through adaptive content and active recall.

📌 Future Enhancements

Multi-language OCR and summarization support

Voice-based study assistant with Q&A capability

Integration with learning management systems (LMS)

Mobile app version

📜 License

This project is for academic and research purposes. All rights reserved by Team NexaSense.


---

