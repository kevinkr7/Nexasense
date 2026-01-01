# NexaSense  
AI-Driven Platform for Structured Content Interpretation and Personalized Learning

---

## 📖 Overview
NexaSense is an AI-powered web application that transforms handwritten and digital study materials into **accurate, concise, and exam-ready learning content**.

The platform not only summarizes notes, but also **verifies and enriches them using trusted academic sources**, ensuring correctness and consistency even when original notes are incomplete or inaccurate.  
Additionally, NexaSense tracks individual learning behavior to deliver a **personalized learning experience**.

---

## 🚀 Core Features (MVP Scope)
- 📄 **Note Upload & OCR**  
  Upload handwritten or digital notes (image/PDF) and extract text using OCR.

- 🧠 **AI-Based Summarization & Simplification**  
  Convert raw notes into structured, easy-to-understand summaries using NLP models.

- 🔍 **Knowledge Verification & Enrichment (RAG-style)**  
  Retrieve relevant information from a curated academic knowledge base to correct and enhance user notes.

- 🎯 **Personalized Learning Experience**  
  Adapt content structure based on user preferences such as learning style and exam urgency.

- 📊 **Learning Progress Tracking**  
  Track learning behavior including revisions, time spent, and assessment performance.

- 🧪 **Assessment Integration (Evalion)**  
  Integrate with an external assessment platform to evaluate learning outcomes and adapt content accordingly.

---

## 🛠️ Tech Stack

### Frontend
- React  
- TypeScript  
- Tailwind CSS  
- Vite  

### Backend
- FastAPI (Python)

### Authentication & User Management
- Firebase Authentication

### Database
- Firebase Firestore (user data & learning analytics)
- ChromaDB (vector database for semantic retrieval)

### OCR
- Tesseract OCR  
- OpenCV (preprocessing)

### NLP & AI
- Hugging Face Transformers  
  - `facebook/bart-large-cnn` – Summarization  
  - `t5-small` – Text simplification  
- Sentence Transformers  
  - `all-MiniLM-L6-v2` – Embeddings for semantic search

### Deployment
- Frontend: Firebase Hosting / Vercel  
- Backend: Render / Railway  
- Auth & Database: Firebase  

---

## 📂 Project Structure
```bash
nexasense/
├── frontend/ # React + TypeScript frontend
├── backend/ # FastAPI backend & AI pipelines
├── datasets/ # Curated academic knowledge sources
├── docs/ # Architecture & documentation
└── README.md
```


---

## ⚙️ Demo Workflow
1. User logs in and sets learning preferences  
2. Uploads handwritten or digital notes  
3. OCR extracts raw text  
4. AI pipeline summarizes and simplifies content  
5. Knowledge retrieval module enriches and corrects notes  
6. User studies personalized learning material  
7. Assessments are conducted via Evalion and progress is tracked  

---

## 🧑‍🤝‍🧑 Team Members
- **Kevin K R** – Backend development, AI/NLP pipelines, knowledge retrieval (RAG), system integration, and deployment  
- **Lakshmi Priya S** – Frontend development, authentication, dashboard design, user experience, and data visualization  
- **Mukesh Kumar S** – Research support, feature exploration, documentation assistance, and testing feedback  

---

## 🎯 Objectives
- Reduce cognitive load during exam preparation  
- Improve accuracy of study material  
- Provide adaptive, student-centric learning support  

---

## 📌 Future Enhancements
- Interactive mind-map visualization  
- YouTube-based learning resource recommendations  
- Multi-language OCR and summarization  
- Advanced learning analytics and recommendations  
- Mobile application support  

---

## 📜 License
This project is developed for academic and research purposes.  
All rights reserved by Team NexaSense.
