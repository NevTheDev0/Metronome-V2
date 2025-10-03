---
title: Metronome V2 API
emoji: 🤖
colorFrom: green
colorTo: blue
sdk: docker  # <--- Use 'docker' for a Dockerized application
app_file: app.py # <--- This line is optional/ignored for 'docker' but harmless
---


# Metronome-V2
Drumming Coach for those looking to self teach, and because I'm a drummer

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
- September 18th: Added the "Adaptive Tempo" feature, which helps you assess and change tempo automatically (helps me personally because I don't know when to move a tempo up or down when practicing)
- September 19th: Added the Summary Screen to actually show you a summary and give it a cleaner look, also rewired the Pose/Webcam component bc it kept turning itself on to spy on you(Creepy) so now end session also stops the camera (This took me like an hour and a half to figure out)
- September 20th: Not all fixes done today but fixed adaptive tempo and how it works, also added a better MIDI thereshold so its not jank
- September 21st: V1 alpha prototype (mouthful I know) is done, today I simply added wrist velocity and some tiny bug fixes. These metrics are prepping for something I originally planned for this project to do (OOO queue spooky AI stuff)
- September 22nd: AI part is done, I collected my data(drumming features from live recordings of my self)
- September 23rd: Started reengineering features
- September 24th: Worked on the baseline model to predict hits vs non hits (Used RandomForest)
- September 25-26th: Took a well deserved break lol
- September 27th: Worked on the MLP so I dont JUST use RandomForest
- September 28th-30th: Worked on fixing issues, figured out how the model was going to work, and almost ready to start integrating the AI into the project

### Next Steps
- Begin collecting drum audio and MIDI data ✅
- Start feature extraction and baseline model testing ✅
- Rewired V1 to not overcomplicate ✅
- Finished Prototype V1 ✅
- Begin the AI process ✅
- Begin Collecting Data from live recordings (of myself) ✅
- Finish a small working model ✅
- Work on the research part of this ❌
- Notebooks ✅




### Changelog
- 2025-07-02: Project officially initialized and planning stage is done, also added this README to it
- 2025-07-13: Started work on the Frontend and how to connect it to the Backend (No ML stuff yet!)
- 2025-08-30: Got sidetracked, almost went insane because of React, anyways finished the Data Logger(Yes me playing) and Extracted Features will upload files soon
- 2025-09-1: Finished Model Training, tested it rigoursly it worked out, also I forgot to commit the files... I'll do it when I feel like it
- 2025-09-5: Trained the model, then realized... why am I training a "timing" classifier on "pose" data? Redoing entire workflow just because(DW I will not slack off this time)
- 2025-09-17: Got the baseline stuff done (Metronome, Hit Accuracy, Hit Timing, Streak, Pose Skeleton). I will update more stuff today to introduce new features
- 2025-09-18: Added the "Adaptive Tempo" feature to the MetronomeV2 app
- 2025-09-19: Added a clean summary screen so you can track your session there! (So cool and Niche)
- 2025-09-20: Fixed how Adaptive tempo works
- 2025-09-21: Fixed some bugs, and most importantly added Velocity for wrists marking the end for V1 alpha
- 2025-09-22: Started collecting AI data (No not from you guys but from me_
- 2025-09-23: Engineered the AI's features
- 2025-09-24: Worked on the baseline model(s)
- 2025-09-27: Engineered the MLP(Multilayer Perceptron) basically a neural network version of Trees, files not uploaded yet because they are all over the place
- 2025-09-30: Fixed a few things but mainly worked on the AI Integration on the backend, now it is almost ready to use
