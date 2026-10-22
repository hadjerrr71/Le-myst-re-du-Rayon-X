
"use strict";

const Game = {
  level: 0,
  unlocked: 0,
  xp: 0,
  completed: [],
  inventory: [],
  selectedPiece: null,
  board: Array(9).fill(null),
  pieces: [],
  word: "",
  wordChoice: "",
  flowerChoice: "",
  filterChoice: "",
  mysteryChoice: "",
  finalStep: 0,
  finalChoice: null,
  expected: 0,

  init() {
    document.querySelectorAll("[data-open]").forEach(button => {
      button.addEventListener("click", () => this.open(Number(button.dataset.open)));
    });

    document.getElementById("start-button").addEventListener("click", () => {
      document.getElementById("missions").scrollIntoView({ behavior: "smooth" });
    });

    document.getElementById("close-mission").addEventListener("click", () => this.close());

    document.getElementById("mission-window").addEventListener("click", event => {
      if (event.target.id === "mission-window") this.close();
    });

    document.getElementById("check-button").addEventListener("click", () => this.check());

    document.getElementById("hint-button").addEventListener("click", () => this.hint());

    document.getElementById("continue-button").addEventListener("click", () => {
      const next = this.level + 1;
      this.close();
      if (next < LEVELS.length && next <= this.unlocked) this.open(next);
    });

    this.update();
  },

  open(index) {
    if (index < 0 || index > this.unlocked || index >= LEVELS.length) return;

    this.level = index;
    this.selectedPiece = null;
    this.word = "";
    this.wordChoice = "";
    this.flowerChoice = "";
    this.filterChoice = "";
    this.mysteryChoice = "";
    this.finalStep = 0;
    this.finalChoice = null;

    document.getElementById("modal-badge").textContent =
      `MISSION ${String(index + 1).padStart(2, "0")}`;
    document.getElementById("modal-title").textContent = LEVELS[index].title;
    document.getElementById("modal-description").textContent = LEVELS[index].description;
    document.getElementById("modal-xp").textContent = `+${LEVELS[index].reward} XP`;
    document.getElementById("feedback").textContent = "";
    document.getElementById("feedback").className = "feedback";
    document.getElementById("game-area").innerHTML = "";

    const done = this.completed.includes(index);
    document.getElementById("check-button").hidden = done;
    document.getElementById("hint-button").hidden = done;
    document.getElementById("continue-button").hidden = !done;

    [
      this.levelPixels,
      this.levelScanner,
      this.levelConvolution,
      this.levelFilters,
      this.levelMystery,
      this.levelFinal
    ][index].call(this);

    document.getElementById("mission-window").hidden = false;
  },

  close() {
    document.getElementById("mission-window").hidden = true;
  },

  message(text, success = false) {
    const feedback = document.getElementById("feedback");
    feedback.textContent = text;
    feedback.className = "feedback " + (success ? "good" : "bad");
  },

  win(numbers = []) {
    if (this.completed.includes(this.level)) return;

    this.completed.push(this.level);
    this.xp += LEVELS[this.level].reward;
    this.inventory.push(...numbers);
    this.unlocked = Math.min(5, Math.max(this.unlocked, this.level + 1));

    this.update();

    document.getElementById("check-button").hidden = true;
    document.getElementById("hint-button").hidden = true;
    document.getElementById("continue-button").hidden = false;

    this.message(
      this.level === 5
        ? "Bravo ! Pixelia est sauvée !"
        : `Mission réussie ! +${LEVELS[this.level].reward} XP.`,
      true
    );
  },

  update() {
    document.getElementById("xp-total").textContent = this.xp;
    document.getElementById("clue-total").textContent = this.completed.length;

    document.querySelectorAll(".mission-card").forEach((card, index) => {
      const done = this.completed.includes(index);
      const unlocked = index <= this.unlocked;

      card.classList.toggle("locked", !unlocked);
      card.querySelector(".status").textContent =
        done ? "✓ Terminée" : unlocked ? "Disponible" : "Verrouillée";

      const button = card.querySelector(".mission-button");
      button.disabled = !unlocked;
      button.textContent = done ? "Rejouer ↻" : unlocked ? "Entrer →" : "Verrouillée";
    });

    const slots = document.getElementById("number-slots");
    slots.innerHTML = "";

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("span");
      cell.className = "empty-slot";

      if (i < this.inventory.length) {
        cell.classList.add("filled-slot");
        cell.textContent = String(this.inventory[i]);
      } else {
        cell.textContent = "?";
      }

      slots.appendChild(cell);
    }

    document.getElementById("inventory-count").textContent =
      `${this.inventory.length} nombre(s) collecté(s)`;
  },

  hint() {
    const hints = [
      "Choisis une pièce, puis sa position dans la grille.",
      "Déplace la loupe sur les différentes parties de la photo.",
      "Sobel mesure les changements d'intensité entre les pixels.",
      "Les contours apparaissent lorsque les valeurs changent fortement.",
      "Cherche le filtre qui met en évidence les limites des objets.",
      "Rappelle-toi : pixel × coefficient, puis somme des produits."
    ];

    this.message("Indice : " + hints[this.level]);
  },

  // NIVEAU 1 : les neuf véritables images découpées.
  levelPixels() {
    const area = document.getElementById("game-area");

    area.innerHTML = `
      <p class="game-instruction">
        Sélectionne un morceau, puis clique sur la case où tu veux le placer.
        Remets les neuf morceaux dans le bon ordre.
      </p>
      <div id="puzzle-board" class="pixel-puzzle"></div>
      <div id="piece-bank" class="piece-bank"></div>
      <p id="puzzle-status" class="small-help">0/9 morceaux placés</p>
    `;

    this.board = Array(9).fill(null);
    this.pieces = [];

    const board = document.getElementById("puzzle-board");
    const bank = document.getElementById("piece-bank");

    const order = [4, 0, 8, 2, 6, 1, 7, 3, 5];

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("button");
      cell.className = "pixel-piece";
      cell.textContent = "?";
      cell.dataset.position = i;

      cell.addEventListener("click", () => {
        if (this.selectedPiece === null) return;

        const piece = this.selectedPiece;
        this.board[i] = piece;

        cell.innerHTML = "";
        const img = document.createElement("img");
        img.src = piece.src;
        img.alt = `Morceau ${piece.correctPosition + 1}`;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        cell.appendChild(img);

        const pieceButton = bank.querySelector(`[data-id="${piece.id}"]`);
        if (pieceButton) pieceButton.hidden = true;

        this.selectedPiece = null;
        bank.querySelectorAll("button").forEach(b => b.classList.remove("selected"));

        document.getElementById("puzzle-status").textContent =
          `${this.board.filter(Boolean).length}/9 morceaux placés`;
      });

      board.appendChild(cell);
    }

    order.forEach((position, id) => {
      const piece = {
        id,
        correctPosition: position,
        src: `assets/images/splitimage.im-${position + 1}.png`
      };

      this.pieces.push(piece);

      const button = document.createElement("button");
      button.className = "pixel-piece";
      button.dataset.id = id;

      const img = document.createElement("img");
      img.src = piece.src;
      img.alt = `Morceau ${position + 1}`;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      img.onerror = () => {
        button.textContent = `Image ${position + 1} introuvable`;
      };

      button.appendChild(img);

      button.addEventListener("click", () => {
        this.selectedPiece = piece;
        bank.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
      });

      bank.appendChild(button);
    });
  },

  // NIVEAU 2 : loupe interactive sur hellocode.jpg.
  levelScanner() {
    const area = document.getElementById("game-area");

    area.innerHTML = `
      <p class="game-instruction">
        La photo est floue ! Déplace ta loupe pour découvrir le message.
        Saisis ensuite le mot que tu as trouvé et choisis la bonne réponse.
      </p>
      <div class="magnifier-wrap" id="magnifier-wrap">
        <img id="hello-image" src="assets/images/hellocode.jpg" alt="Message caché">
        <div id="loupe"></div>
      </div>
      <label for="word-answer">Quel message as-tu découvert ?</label>
      <input id="word-answer" class="answer-input" type="text"
        placeholder="Écris le message ici..." autocomplete="off">
      <p>Choisis le message que tu as observé :</p>
      <div class="choice-list">
        <button class="choice-row" data-word="hello world">hello world</button>
        <button class="choice-row" data-word="hello pixel">hello pixel</button>
        <button class="choice-row" data-word="good morning">good morning</button>
      </div>
    `;

    const wrap = document.getElementById("magnifier-wrap");
    const img = document.getElementById("hello-image");
    const loupe = document.getElementById("loupe");

    const moveLoupe = event => {
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        loupe.style.display = "none";
        return;
      }

      loupe.style.display = "block";
      loupe.style.left = `${Math.max(0, Math.min(rect.width - 150, x - 75))}px`;
      loupe.style.top = `${Math.max(0, Math.min(rect.height - 150, y - 75))}px`;

      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;

      loupe.style.backgroundImage = `url("${img.src}")`;
      loupe.style.backgroundSize =
        `${img.clientWidth * 3}px ${img.clientHeight * 3}px`;
      loupe.style.backgroundPosition =
        `${-x * 3 + 75}px ${-y * 3 + 75}px`;
      loupe.style.backgroundRepeat = "no-repeat";
      loupe.dataset.sourceX = String(x * scaleX);
      loupe.dataset.sourceY = String(y * scaleY);
    };

    wrap.addEventListener("pointermove", moveLoupe);
    wrap.addEventListener("pointerleave", () => {
      loupe.style.display = "none";
    });

    document.querySelectorAll("[data-word]").forEach(button => {
      button.addEventListener("click", () => {
        this.wordChoice = button.dataset.word;
        document.querySelectorAll("[data-word]").forEach(b =>
          b.classList.toggle("selected", b === button)
        );
      });
    });
  },

  // NIVEAU 3 : image de fleur et véritable filtre Sobel.

levelConvolution() {
    const area = document.getElementById("game-area");

    area.innerHTML = `
        <section class="edge-game">
            <h2>🌸 La fenêtre secrète</h2>
            <p>
                Fais glisser le curseur pour régler le filtre de contours
                et découvrir les contours de la fleur.
            </p>

            <div class="edge-images">
                <div class="edge-panel">
                    <h3>Image originale</h3>
                    <canvas id="flower-original"></canvas>
                </div>

                <div class="edge-panel">
                    <h3>Après le filtre de contours</h3>
                    <canvas id="flower-edges"></canvas>
                </div>
            </div>

            <div class="edge-controls">
                <label for="edge-threshold">
                    Sensibilité du filtre :
                    <strong id="threshold-value">220

                    </strong>
                </label>

                <input
                    id="edge-threshold"
                    type="range"
                    min="10"
                    max="220"
                    value="220"
                    step="5"
                />

                <button id="apply-edge-filter" type="button">
                    Appliquer le filtre
                </button>

                <p id="edge-message" role="status">
                    Préparation de l'image...
                </p>
            </div>
        </section>
    `;

    const originalCanvas = document.getElementById("flower-original");
    const edgeCanvas = document.getElementById("flower-edges");
    const originalCtx = originalCanvas.getContext("2d", {
        willReadFrequently: true
    });
    const edgeCtx = edgeCanvas.getContext("2d");

    const slider = document.getElementById("edge-threshold");
    const valueLabel = document.getElementById("threshold-value");
    const message = document.getElementById("edge-message");
    const applyButton = document.getElementById("apply-edge-filter");

    const image = new Image();
    image.src = "assets/images/fleur.jpg";

    let imageReady = false;
    let filterApplied = false;

    image.onload = () => {
        const maxWidth = 600;
        const scale = Math.min(1, maxWidth / image.naturalWidth);

        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        originalCanvas.width = width;
        originalCanvas.height = height;
        edgeCanvas.width = width;
        edgeCanvas.height = height;

        originalCtx.drawImage(image, 0, 0, width, height);
        imageReady = true;

        applyFilter();
        message.textContent =
            "Image chargée ! Déplace le curseur pour modifier les contours.";
    };

    image.onerror = () => {
        message.textContent =
            "Impossible de charger fleur.jpg. Vérifie le dossier assets/images/.";
    };

    function applyFilter() {
        if (!imageReady) return;

        const width = originalCanvas.width;
        const height = originalCanvas.height;
        const threshold = Number(slider.value);

        valueLabel.textContent = threshold;

        const source = originalCtx.getImageData(0, 0, width, height);
        const input = source.data;
        const output = edgeCtx.createImageData(width, height);
        const result = output.data;

        // Conversion de l'image en niveaux de gris.
        const gray = new Float32Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const p = i * 4;
            gray[i] =
                0.299 * input[p] +
                0.587 * input[p + 1] +
                0.114 * input[p + 2];
        }

        // Masques Sobel : détection des variations horizontales et verticales.
        const sobelX = [
            -1, 0, 1,
            -2, 0, 2,
            -1, 0, 1
        ];

        const sobelY = [
            -1, -2, -1,
             0,  0,  0,
             1,  2,  1
        ];

        // Fond blanc et contours noirs.
        for (let i = 0; i < width * height; i++) {
            const p = i * 4;
            result[p] = 255;
            result[p + 1] = 255;
            result[p + 2] = 255;
            result[p + 3] = 255;
        }

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;
                let k = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const pixel = gray[
                            (y + dy) * width + (x + dx)
                        ];

                        gx += pixel * sobelX[k];
                        gy += pixel * sobelY[k];
                        k++;
                    }
                }

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const edge = magnitude >= threshold ? 0 : 255;
                const p = (y * width + x) * 4;

                result[p] = edge;
                result[p + 1] = edge;
                result[p + 2] = edge;
                result[p + 3] = 255;
            }
        }

        edgeCtx.putImageData(output, 0, 0);
        filterApplied = true;
    }

    slider.addEventListener("input", applyFilter);

    applyButton.addEventListener("click", () => {
        if (!imageReady) {
            message.textContent = "Attends que l'image soit chargée.";
            return;
        }

        applyFilter();
        message.textContent =
            "Bravo ! Le filtre Sobel a détecté les contours de la fleur.";

        // Réutilise la récompense du jeu si la fonction existe.
        if (typeof this.win === "function") {
            this.win();
        }
    });
},


  sobel(source) {
    const { width, height, data } = source;
    const gray = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const p = i * 4;
      gray[i] = 0.299 * data[p] +
        0.587 * data[p + 1] +
        0.114 * data[p + 2];
    }

    const result = new ImageData(width, height);
    const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;
        let k = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const value = gray[(y + dy) * width + x + dx];
            gx += value * gxKernel[k];
            gy += value * gyKernel[k];
            k++;
          }
        }

        const magnitude = Math.min(255, Math.hypot(gx, gy));
        const p = (y * width + x) * 4;
        result.data[p] = magnitude;
        result.data[p + 1] = magnitude;
        result.data[p + 2] = magnitude;
        result.data[p + 3] = 255;
      }
    }

    return result;
  },

  // NIVEAU 4 : comparer trois filtres.
levelFilters() {
    const area = document.getElementById("game-area");

    area.innerHTML = `
        <section class="edge-game">
            <h2>🏛️ Mission 4 — Le secret de la pièce romaine</h2>
            <p>Applique le filtre Emboss pour révéler l'inscription cachée.</p>

            <div class="edge-images">
                <div class="edge-panel">
                    <h3>Pièce mystérieuse</h3>
                    <canvas id="map-original"></canvas>
                </div>
                <div class="edge-panel">
                    <h3>Après le filtre Emboss</h3>
                    <canvas id="map-emboss"></canvas>
                </div>
            </div>

            <button id="apply-emboss" type="button">
                Appliquer le filtre Emboss
            </button>

            <p id="map-message">Chargement de la pièce...</p>

            <div id="answer-area" style="display:none; margin-top:15px;">
                <label for="secret-word">Quel mot est gravé sur la pièce ?</label>
                <input id="secret-word" type="text" placeholder="Écris le mot secret">
                <button id="check-word" type="button">Valider</button>
            </div>
        </section>
    `;

    const original = document.getElementById("map-original");
    const result = document.getElementById("map-emboss");
    const ctx = original.getContext("2d", { willReadFrequently: true });
    const out = result.getContext("2d", { willReadFrequently: true });
    const message = document.getElementById("map-message");
    const answerArea = document.getElementById("answer-area");

    const img = new Image();
    img.src = "assets/images/carte.jpg";

    let ready = false;
    let completed = false;

    img.onload = () => {
        const scale = Math.min(1, 600 / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);

        original.width = result.width = w;
        original.height = result.height = h;

        // Image mystérieuse : fleur floue
        ctx.filter = "blur(6px)";
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = "none";

        // Résultat vide avant l'application du filtre
        out.clearRect(0, 0, w, h);

        ready = true;
        message.textContent = "Clique sur le bouton pour révéler les détails.";
    };

    img.onerror = () => {
        message.textContent = "Erreur : vérifie le chemin assets/images/carte.jpg.";
    };

    document.getElementById("apply-emboss").addEventListener("click", () => {
        if (!ready) return;

        // Appliquer Emboss à l'image originale, pas à sa version floue
        const w = original.width;
        const h = original.height;

        const temp = document.createElement("canvas");
        temp.width = w;
        temp.height = h;

        const tempCtx = temp.getContext("2d", { willReadFrequently: true });
        tempCtx.drawImage(img, 0, 0, w, h);

        const src = tempCtx.getImageData(0, 0, w, h);
        const dst = out.createImageData(w, h);
        const a = src.data;
        const b = dst.data;

        const kernel = [
            -2, -1, 0,
            -1,  1, 1,
             0,  1, 2
        ];

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let value = 128;
                let k = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const p = (ny * w + nx) * 4;
                            const gray =
                                0.299 * a[p] +
                                0.587 * a[p + 1] +
                                0.114 * a[p + 2];

                            value += gray * kernel[k];
                        }
                        k++;
                    }
                }

                value = Math.max(0, Math.min(255, value));
                const p = (y * w + x) * 4;

                b[p] = b[p + 1] = b[p + 2] = value;
                b[p + 3] = 255;
            }
        }

        out.putImageData(dst, 0, 0);
        answerArea.style.display = "block";
        message.textContent = "Filtre Emboss appliqué ! Observe l'inscription.";
    });

    document.getElementById("check-word").addEventListener("click", () => {
        const answer = document.getElementById("secret-word").value.trim().toUpperCase();

        if (answer === "CAESAR") {
            message.textContent = "Bravo ! Tu as découvert CAESAR !";

            if (!completed && typeof this.win === "function") {
                completed = true;
                this.win();
            }
        } else {
            message.textContent = "Essaie encore ! Observe attentivement l'image.";
        }
    });
},

  drawFilter(type) {
    const canvas = document.getElementById("filter-preview");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const image = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];

    const kernels = {
      identity: [[0,0,0],[0,1,0],[0,0,0]],
      blur: [[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],
      edges: [[0,-1,0],[-1,4,-1],[0,-1,0]],
      sharpen: [[0,-1,0],[-1,5,-1],[0,-1,0]]
    };

    const output = this.applyKernel(image, kernels[type] || kernels.identity);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f2ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cell = 22;
    const left = (canvas.width - image[0].length * cell) / 2;
    const top = (canvas.height - image.length * cell) / 2;

    output.forEach((row, y) => row.forEach((value, x) => {
      let gray;

      if (type === "edges") {
        gray = Math.min(255, Math.abs(value) * 75);
      } else {
        gray = Math.max(0, Math.min(255, 245 - value * 180));
      }

      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(left + x * cell, top + y * cell, cell - 2, cell - 2);
    }));
  },

  applyKernel(image, kernel) {
    const h = image.length;
    const w = image[0].length;
    const result = Array.from({ length: h }, () => Array(w).fill(0));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const py = Math.max(0, Math.min(h - 1, y + ky));
            const px = Math.max(0, Math.min(w - 1, x + kx));
            sum += image[py][px] * kernel[ky + 1][kx + 1];
          }
        }

        result[y][x] = sum;
      }
    }

    return result;
  },

  // NIVEAU 5 : reconnaître le filtre adapté.
  levelMystery() {
    document.getElementById("game-area").innerHTML = `
      <p class="game-instruction">
        Une forme est presque invisible. Quel filtre peut mettre en évidence ses contours ?
      </p>
      <canvas id="mystery-preview" class="filter-demo" width="420" height="180"></canvas>
      <div class="choice-list">
        <button class="choice-row" data-mystery="blur">Filtre de flou</button>
        <button class="choice-row" data-mystery="edges">Détection des contours</button>
        <button class="choice-row" data-mystery="sharpen">Filtre de netteté</button>
      </div>
    `;

    this.drawMystery("identity");

    document.querySelectorAll("[data-mystery]").forEach(button => {
      button.addEventListener("click", () => {
        this.mysteryChoice = button.dataset.mystery;
        document.querySelectorAll("[data-mystery]").forEach(b =>
          b.classList.toggle("selected", b === button)
        );
        this.drawMystery(this.mysteryChoice);
      });
    });
  },

  drawMystery(type) {
    this.drawFilter(type);
    const canvas = document.getElementById("filter-preview") ||
      document.getElementById("mystery-preview");

    // L'aperçu du niveau 5 utilise son propre canvas.
    const target = document.getElementById("mystery-preview");
    if (!target) return;

    const ctx = target.getContext("2d");
    ctx.clearRect(0, 0, target.width, target.height);
    const image = [
      [0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0],
      [0,1,1,1,1,1,0],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0]
    ];
    const kernels = {
      identity: [[0,0,0],[0,1,0],[0,0,0]],
      blur: [[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],
      edges: [[0,-1,0],[-1,4,-1],[0,-1,0]],
      sharpen: [[0,-1,0],[-1,5,-1],[0,-1,0]]
    };
    const output = this.applyKernel(image, kernels[type] || kernels.identity);
    const cell = 22;
    const left = (target.width - 7 * cell) / 2;
    const top = (target.height - 6 * cell) / 2;

    output.forEach((row, y) => row.forEach((value, x) => {
      const gray = type === "edges"
        ? Math.min(255, Math.abs(value) * 75)
        : Math.max(0, Math.min(255, 245 - value * 180));
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(left + x * cell, top + y * cell, cell - 2, cell - 2);
    }));
  },

  // NIVEAU 6 : trois questions.
  levelFinal() {
    document.getElementById("game-area").innerHTML = `
      <div class="final-banner">
        <div class="medal">🏙️</div>
        <h3>Sauver Pixelia</h3>
        <p>Réponds aux trois questions pour terminer l'enquête.</p>
      </div>
      <div id="final-question"></div>
    `;

    this.finalStep = 0;
    this.showFinal();
  },

  showFinal() {
    const questions = [
      {
        text: "Quel filtre fait ressortir les contours ?",
        choices: ["Flou", "Détection des contours", "Saturation"],
        answer: 1
      },
      {
        text: "Combien de coefficients contient une matrice 3 × 3 ?",
        choices: ["3", "6", "9"],
        answer: 2
      },
      {
        text: "Comment calcule-t-on la somme de convolution ?",
        choices: [
          "On additionne uniquement les pixels",
          "On multiplie chaque pixel par son coefficient, puis on additionne",
          "On choisit un nombre au hasard"
        ],
        answer: 1
      }
    ];

    const q = questions[this.finalStep];
    const box = document.getElementById("final-question");

    box.innerHTML = `
      <p class="game-instruction">Défi ${this.finalStep + 1}/3 — ${q.text}</p>
      <div class="choice-list">
        ${q.choices.map((choice, index) =>
          `<button class="choice-row" data-final="${index}">${choice}</button>`
        ).join("")}
      </div>
    `;

    this.finalChoice = null;

    box.querySelectorAll("[data-final]").forEach(button => {
      button.addEventListener("click", () => {
        this.finalChoice = Number(button.dataset.final);
        box.querySelectorAll("[data-final]").forEach(b =>
          b.classList.toggle("selected", b === button)
        );
      });
    });
  },

  check() {
    if (this.completed.includes(this.level)) return;

    switch (this.level) {
      case 0: {
        if (this.board.some(piece => !piece)) {
          this.message("Place les neuf morceaux avant de vérifier.");
          return;
        }

        const correct = this.board.every((piece, position) =>
          piece.correctPosition === position
        );

        if (!correct) {
          this.message("Certains morceaux ne sont pas à leur place. Réessaie !");
          return;
        }

        this.win([1, 0, -1, 1, 0, -1, 1, 0, -1]);
        break;
      }

      case 1: {
        const answer = document.getElementById("word-answer").value.trim().toLowerCase();

        if (answer !== "hello world" || this.wordChoice !== "hello world") {
          this.message("Le message doit être « hello world » dans le champ et dans les choix.");
          return;
        }

        this.win([1, 0, -1]);
        break;
      }

      case 2: {
        if (!this.flowerChoice) {
          this.message("Choisis la région qui contient la fleur.");
          return;
        }

        // Hypothèse pédagogique : la fleur est au centre de la photo.
        // Change la bonne réponse si ta photo place la fleur ailleurs.
        if (this.flowerChoice !== "center") {
          this.message("Observe les contours et essaie une autre zone.");
          return;
        }

        this.win([]);
        break;
      }

      case 3:
        if (this.filterChoice === "edges") {
          this.win([1, -1]);
        } else {
          this.message("Choisis le filtre qui souligne les limites des objets.");
        }
        break;

      case 4:
        if (this.mysteryChoice === "edges") {
          this.win([2, -1]);
        } else {
          this.message("Essaie le filtre qui révèle les changements d'intensité.");
        }
        break;

      case 5: {
        const answers = [1, 2, 1];

        if (this.finalChoice === null) {
          this.message("Choisis une réponse.");
          return;
        }

        if (this.finalChoice !== answers[this.finalStep]) {
          this.message("Pas encore, détective. Réessaie !");
          return;
        }

        if (this.finalStep < 2) {
          this.finalStep++;
          this.showFinal();
          this.message("Bonne réponse ! Passe au défi suivant.", true);
        } else {
          this.win([]);
        }
        break;
      }
    }
  }
};
