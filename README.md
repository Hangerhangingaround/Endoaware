# EndoAware - Early Risk Detection for Endometriosis

EndoAware is a modern, responsive web application designed for early risk detection and cycle-based symptom tracking for Endometriosis. It provides an intuitive interface for logging daily symptoms, visualizing health trends across multiple cycles, and exporting structured summaries to share with healthcare professionals.

---

## 🚀 How to Run the Project Locally

Since this is a client-side web application, it doesn't require complex installation steps or backend servers.

### Method 1: The Quick Way (Direct Launch)
1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/Hangerhangingaround/Endoaware.git
   cd Endoaware
   ```
2. **Open index.html:**
   Double-click the `index.html` file in your file explorer, or right-click it and select **Open with** and choose any web browser (Chrome, Safari, Edge, Firefox, etc.).

---

### Method 2: Using a Local Development Server (Recommended)
Running through a local server ensures full compatibility with browser security policies, especially if you plan to integrate advanced APIs.

#### Option A: VS Code "Live Server" (Easiest)
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Click the **Go Live** button at the bottom-right corner of VS Code.

#### Option B: Python (No installation needed if Python is on your system)
Open your terminal in the project directory and run:
* **Python 3:**
  ```bash
  python -m http.server 8000
  ```
* Open your browser and navigate to `http://localhost:8000`.

#### Option C: Node.js (npx serve)
If you have Node.js installed, run:
```bash
npx serve
```
* Open your browser and navigate to the address shown in the terminal (typically `http://localhost:3000`).

---

## 📁 Project Structure

* `index.html` - The structural markup and user interface container.
* `app.js` - Application logic, sample data simulation, and symptom-tracking algorithm.
* `styles.css` - Custom premium styling, glassmorphism UI tokens, and interactive layout system.
* `EndoAware.pdf` - Project presentation, outlining the motivation, features, and research.
