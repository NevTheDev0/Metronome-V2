# Metronome-V2
AI Drumming Coach for those looking to self teach, and because I'm a drummer

### Live Site
You can try it out here 👉 (or don't and keep reading the README like a nerd) : [Metronome-V2 Demo](https://metronome-v2.vercel.app/)


### Why?
One of the hardest parts about drumming alone is that there's really nobody around who can criticize the mistakes you make during playing, this project hopes to help you out

### Features
Some of the things that this project will help you work on include:
- Beat timing
- Accuracy
- Posture
But it will not instantly make you a professional, you do that by practicing

### Tech Stack
**Frontend**  
- HTML, CSS, JavaScript  
- React + TailwindCSS  
- getUserMedia() API (for webcam/audio capture)

**Backend**  
- FastAPI (for API and WebSocket handling)  
- MediaPipe (real-time pose estimation)  
- mido + python-rtmidi (MIDI input parsing)

**Machine Learning / Analysis**  
- scikit-learn (baseline timing models)  
- TensorFlow / PyTorch (deep learning for pose & beat classification)  
- Jupyter Notebooks (model development)

**Data & Visualization**  
- numpy, pandas (data handling)  
- matplotlib, seaborn (visual feedback)

### Status
- Project in early development (started July 1-2, 2025)
- July 2nd 2025: Currently finalizing data sources and initial system design
- July 3rd-10th: Started work on the Backend
- July 13th: Started work on the Fronted
- July 20th: Frontend alpha done, won't commit just yet needs a lot of tweaking, also successfuly connected Frontend to Backend
- September 1st: Finished FE, and Baseline model (I took a break working from this dw I'm back)
- September 5th: Trained model on all the wrong features, will redo the model again(My bad)
- September 17th: Refactored the drumming coach for 2 weeks and replanned how the AI model will work

### Next Steps
- Begin collecting drum audio and MIDI data ✅
- Start feature extraction and baseline model testing ✅




### Changelog
- 2025-07-02: Project officially initialized and planning stage is done, also added this README to it
- 2025-07-13: Started work on the Frontend and how to connect it to the Backend (No ML stuff yet!)
- 2025-08-30: Got sidetracked, almost went insane because of React, anyways finished the Data Logger(Yes me playing) and Extracted Features will upload files soon
- 2025-09-1: Finished Model Training, tested it rigoursly it worked out, also I forgot to commit the files... I'll do it when I feel like it
- 2025-09-5: Trained the model, then realized... why am I training a "timing" classifier on "pose" data? Redoing entire workflow just because(DW I will not slack off this time)
- 2025-09-17: Got the baseline stuff done (Metronome, Hit Accuracy, Hit Timing, Streak, Pose Skeleton). I will update more stuff today to introduce new features

