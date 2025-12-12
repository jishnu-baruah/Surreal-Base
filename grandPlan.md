# **🚀 Surreal World Assets Buildathon: The "Hydra" Strategy**

**Goal:** Maximize winning probability by submitting to **3 Main Tracks** + **2 Bonus Challenges** using a single shared backend.

---

## **🏛 Core Architecture: "The Universal Minting Engine"**

Instead of building 3 separate backends, we build **ONE** Next.js API that handles all Story Protocol interactions.

- **Repo:** `universal-minting-engine` (Next.js)
- **API Route:** `POST /api/mint-ip`
- **Function:**
    1. Receives Data (JSON/File) + Metadata.
    2. Uploads to **Pinata (IPFS)**.
    3. Mints IP Asset via **Story Protocol SDK**.
    4. (Optional) Registers "Parent IP" for Remixing (Sigma Music integration).

---

## **🥇 Project 1: MoveMint (Creative Front-End Track)**

**Tagline:** "TikTok for Choreography." **Concept:** A web app that captures dance moves via webcam, mints them as IP, and remixes Sigma Music tracks.

### **🧩 Key Features & Integrations**

1. **Motion Capture:** Uses **TensorFlow.js** (PoseNet/MoveNet) to extract skeleton vectors.
2. **Coinbase Smart Wallet:** Frictionless login (Gmail/Biometrics) using **Coinbase OnchainKit**.
3. **Sigma Music Remix:** Users select a track from Sigma Music to dance to. The minted "Dance IP" is registered as a *derivative* of the Sigma Song IP.

### **🔗 Required Resources**

- **Sigma Music Assets (for Remixing):**
    - Browse Tracks/IP: https://sigmamusic.fm/
    - Sigma Music Links: https://linktr.ee/SigmaXMusic
    - *Implementation Note:* Hardcode 3-4 Sigma Music IP Asset IDs into your app for the demo. When a user selects one, pass that ID as the `parentIpId` to your Minting Engine.

### **🎬 Demo Flow**

1. User logs in (Coinbase Smart Wallet).
2. Selects "Sigma Track #1".
3. Webcam turns on -> User dances -> AI extracts skeleton.
4. User clicks "Mint Routine".
5. App shows: "Routine Minted! Linked to Sigma Track #1".

---

## **🥈 Project 2: Kinetic (Hardware / DePIN Track)**

**Tagline:** "The Black Box for Human Labor." **Concept:** An ESP32 wearable that captures expert industrial motion (welding, surgery) and cryptographically signs it at the edge.

### **🧩 Key Features & Integrations**

1. **Hardware Provenance:** ESP32 captures 6-axis IMU data + signs payload with Device ID.
2. **World ID Verification:** Prevents "Bot Spam." A user must verify they are a unique human via World ID *before* the dashboard allows them to mint the data.

### **🔗 Required Resources**

- **World ID Docs (Developer Portal):**
    - Quick Start: https://docs.world.org/
    - IDKit JS (Frontend Widget): https://docs.world.org/idkit
    - *Implementation Note:* Wrap your "Mint" button in the `<IDKitWidget />`. Only execute the API call to your backend `onSuccess`.

### **🎬 Demo Flow**

1. Camera shows ESP32 attached to a glove/tool.
2. User performs a "Welding Motion."
3. Dashboard shows live line chart spiking.
4. User clicks "Mint" -> **World ID Popup appears** -> User verifies (Simulator).
5. Success! Asset minted on Story Protocol with "Verified Human" tag.

---

## **🥉 Project 3: StoryLite (OSS / Dev Tooling Track)**

**Tagline:** "The cURL for Intellectual Property." **Concept:** A CLI tool wrapping your "Universal Minting Engine" to let devs mint files from the terminal.

### **🧩 Key Features**

- **Command:** `npx storylite mint ./algorithm.py --title "My Algo"`
- **Utility:** Abstracts away Wallet/RPC setup for CI/CD pipelines.

---

## **🛠️ 48-Hour Implementation Plan**

### **Phase 1: The Core (Hours 0-6)**

- **Goal:** A working API that mints *anything* to Story.
- **Stack:** Next.js + `@story-protocol/core-sdk` + `pinata-web3`.
- **Code:** Create `app/api/mint/route.ts`.

### **Phase 2: Kinetic Hardware (Hours 6-12)**

- **Goal:** ESP32 streaming data.
- **Hardware:** Connect MPU6050 to ESP32.
- **Firmware:**
    - Read Accel/Gyro.
    - Create JSON: `{"device": "ESP_01", "motion": [...]}`.
    - `HTTPClient.post("https://your-app.vercel.app/api/mint", json)`.

### **Phase 3: MoveMint Web & Integrations (Hours 12-24)**

- **Goal:** Webcam capture & "Power-Ups".
- **Frontend:**
    - Install `@tensorflow-models/pose-detection`.
    - Draw skeleton on `<canvas>`.
- **Integrate Sigma:** Add a dropdown: "Select Music". Pass the ID to the backend.
- **Integrate Coinbase:** Wrap app in `<CoinbaseWalletProvider>`.

### **Phase 4: StoryLite CLI (Hours 24-28)**

- **Goal:** CLI Wrapper.
- **Code:**
    - `mkdir cli && cd cli`
    - `npm init` & `npm i commander axios`
    - Script: Read file -> `axios.post("https://your-app.vercel.app/api/mint", fileData)`.

### **Phase 5: Polish & Video (Hours 28-48)**

- **Kinetic:** Add **World ID** widget to the dashboard.
- **Mintellect:** Add "Mint" button to your existing research app.
- **Videos:** Record 3 separate 60s videos.

---

## **📄 Submission Copy (Copy-Paste Ready)**

### **1. Kinetic (Hardware Track)**

**One-Liner:** Verifiable, On-Chain IP for Embodied AI Motion Data. **Description:** Kinetic is a DePIN hardware node that captures expert physical skills (welding, surgery) and mints them as IP Assets on Story Protocol.

- **Problem:** Embodied AI needs real human data, but synthetic data fails to capture tactile nuance.
- **Solution:** We use an ESP32 to capture high-fidelity motion, sign it at the edge (Hardware Provenance), and gate minting via **World ID** (Proof of Humanity).
- **Tech:** ESP32, MPU6050, Story Protocol, World ID.

### **2. MoveMint (Creative Track)**

**One-Liner:** The "TikTok" for Copyrighting Choreography. **Description:** MoveMint allows anyone to secure the rights to their dance moves instantly.

- **Innovation:** Uses TensorFlow.js to extract motion vectors from a webcam feed and mints them as IP.
- **Remix Culture:** Integrates **Sigma Music** assets, allowing users to create "Derivative Motion Assets" linked to existing on-chain music.
- **Adoption:** Uses **Coinbase Smart Wallet** for 1-click, gasless onboarding.

### **3. StoryLite (Dev Tooling Track)**

**One-Liner:** Mint IP from your Terminal. **Description:** StoryLite is the "cURL" for Story Protocol. It abstracts away the complexity of Wallets, RPCs, and Metadata standards, allowing developers to mint IP assets directly from their CLI or CI/CD pipelines.

- **Command:** `npx storylite mint <file>`

---

## **✅ Final Checklist**

- [ ]  **Sigma Music:** Did you use a real Sigma Music Asset ID as the parent for the remix demo?
- [ ]  **World ID:** Is the "Verify with World ID" button visible in the Kinetic video?
- [ ]  **Graphs:** Does the Kinetic dashboard show a live line chart?
- [ ]  **CLI:** Does the CLI show a green "Success" message in the video?

**Go build. Good luck!**