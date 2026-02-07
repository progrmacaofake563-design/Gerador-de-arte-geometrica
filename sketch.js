/* * sketch.js
 * Lógica de processamento de imagem e animação
 * Baseado em Canvas API (Vanilla JS)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Configuração e Estado ---
    const config = {
        width: 1920,
        height: 1080,
        shapes: ['circle', 'square'],
        abstraction: 50,
        paintSpeed: 40,
        duration: 30000,
        isRunning: false,
        startTime: 0,
        currentMode: 'none',
        currentTag: '',
        evolutionMode: true // O modo matemático que você gosta
    };

    // --- Elementos do DOM ---
    const canvas = document.getElementById('artCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Elementos de UI
    const ui = {
        loader: document.getElementById('statusOverlay'),
        statusText: document.getElementById('statusText'),
        loaderSpinner: document.querySelector('.loader'),
        trendingList: document.getElementById('trendingList'),
        searchPanel: document.getElementById('searchPanel'),
        searchInput: document.getElementById('searchInput'),
        btnDetail: document.getElementById('btnDetailMode'),
        abstractionGroup: document.getElementById('abstractionGroup'),
        speedVal: document.getElementById('speedVal')
    };

    // Variáveis Globais de Processamento
    let sourceData = null;
    let animationFrameId = null;
    let originalImg = null;

    // --- Inicialização ---
    function init() {
        canvas.width = config.width;
        canvas.height = config.height;
        generateTrending();
        updateDetailBtnUI();
        
        // Inicia com uma imagem aleatória
        document.getElementById('btnRandom').click();
    }

    // --- Funções de UI ---
    
    function generateTrending() {
        const themes = [
            { name: "Cyberpunk", tag: "cyberpunk,neon", color: "#22d3ee" },
            { name: "Natureza", tag: "forest,nature", color: "#4ade80" },
            { name: "Retrato", tag: "portrait,face", color: "#f472b6" },
            { name: "Espaço", tag: "galaxy,nebula", color: "#818cf8" },
            { name: "Arquitetura", tag: "architecture,city", color: "#fb923c" }
        ];

        ui.trendingList.innerHTML = '';
        themes.forEach((item, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-trend';
            btn.innerHTML = `<span>#${i+1} ${item.name}</span> <span style="color:${item.color};">▶</span>`;
            btn.onclick = () => {
                config.currentMode = 'search';
                config.currentTag = item.tag;
                searchImage(item.tag);
            };
            ui.trendingList.appendChild(btn);
        });
    }

    function updateDetailBtnUI() {
        if(config.evolutionMode) {
            ui.btnDetail.classList.add('active');
            ui.btnDetail.querySelector('.badge').innerText = "ON";
            ui.abstractionGroup.classList.add('disabled');
            ui.speedVal.innerText = "Auto";
        } else {
            ui.btnDetail.classList.remove('active');
            ui.btnDetail.querySelector('.badge').innerText = "OFF";
            ui.abstractionGroup.classList.remove('disabled');
            ui.speedVal.innerText = config.paintSpeed > 30 ? "Rápido" : "Normal";
        }
    }

    function setLoading(isLoading, text) {
        if(isLoading) {
            ui.loader.style.display = 'flex';
            ui.statusText.innerText = text;
            ui.loaderSpinner.style.display = 'block';
        } else {
            ui.loader.style.display = 'none';
        }
    }

    // --- Lógica de Imagem ---

    function searchImage(keyword) {
        config.currentMode = 'search';
        config.currentTag = keyword;
        loadImage(`https://loremflickr.com/1920/1080/${encodeURIComponent(keyword)}`, 0);
    }

    function loadImage(baseUrl, attempt) {
        if (attempt === 0) setLoading(true, "Processando imagem...");
        
        config.isRunning = false;
        if(animationFrameId) cancelAnimationFrame(animationFrameId);

        const img = new Image();
        img.crossOrigin = "Anonymous"; // Essencial para evitar bloqueio do Canvas

        img.onload = () => {
            originalImg = img;
            startArt();
            setLoading(false);
        };

        img.onerror = () => {
            if (attempt < 3) {
                // Tenta novamente após delay
                setTimeout(() => loadImage(baseUrl, attempt + 1), 1500);
            } else {
                setLoading(true, "Erro na fonte. Tentando outra...");
                setTimeout(nextImage, 1000);
            }
        };

        // Adiciona timestamp para evitar cache
        const src = baseUrl.startsWith('data:') ? baseUrl : `${baseUrl.split('?')[0]}?random=${Date.now()}`;
        img.src = src;
    }

    function nextImage() {
        if (config.currentMode === 'search') searchImage(config.currentTag);
        else if (config.currentMode === 'random' || config.currentMode === 'none') document.getElementById('btnRandom').click();
        else if (config.currentMode === 'upload') startArt();
    }

    // --- Core da Arte (O Loop) ---

    function startArt() {
        // Cria canvas temporário para ler os pixels da imagem original
        const offCanvas = document.createElement('canvas');
        offCanvas.width = config.width;
        offCanvas.height = config.height;
        const offCtx = offCanvas.getContext('2d');
        
        // Desenha a imagem cobrindo toda a área (object-fit: cover)
        drawImageCover(offCtx, originalImg, config.width, config.height);

        try {
            sourceData = offCtx.getImageData(0, 0, config.width, config.height).data;
        } catch(e) {
            setLoading(true, "Erro CORS. Tente outra imagem.");
            return;
        }

        // Limpa o canvas principal com fundo escuro
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, config.width, config.height);

        config.startTime = Date.now();
        config.isRunning = true;
        loop();
    }

    function loop() {
        if(!config.isRunning) return;

        const elapsed = Date.now() - config.startTime;
        const duration = parseInt(config.duration);

        // Se o tempo acabou, busca próxima imagem
        if(elapsed > duration) {
            nextImage();
            return;
        }

        const progress = Math.min(elapsed / duration, 1.0);
        let currentBaseSize = 40;
        let loopsThisFrame = 1;

        // === MATEMÁTICA DE EVOLUÇÃO (Não alterar) ===
        if (config.evolutionMode) {
            const shrinkLimit = duration >= 120000 ? 0.4 : 0.6;
            let sizeProgress = progress / shrinkLimit;
            if (sizeProgress > 1) sizeProgress = 1;

            currentBaseSize = 40 * (3.5 * (1 - sizeProgress) + 0.1 * sizeProgress);
            loopsThisFrame = Math.floor((config.paintSpeed / 10) * Math.pow(150 / currentBaseSize, 1.5) * 0.5);
        } else {
            currentBaseSize = map(config.abstraction, 1, 100, 5, 80);
            loopsThisFrame = config.paintSpeed;
        }
        // =============================================

        // Limites de segurança
        if (currentBaseSize < 2) currentBaseSize = 2;
        if (loopsThisFrame < 1) loopsThisFrame = 1;
        if (loopsThisFrame > 600) loopsThisFrame = 600;

        let shapesToUse = config.shapes.length > 0 ? config.shapes : ['circle'];

        for(let i=0; i < loopsThisFrame; i++) {
            const x = Math.floor(Math.random() * config.width);
            const y = Math.floor(Math.random() * config.height);
            const idx = (y * config.width + x) * 4;

            // Pula pixels muito escuros (opcional, mas melhora o contraste)
            if(sourceData[idx+3] < 20) continue;

            // Variação natural de tamanho
            const naturalJitter = 0.6 + (Math.random() * 0.8);
            
            // Tamanho baseado no brilho do pixel
            const brightness = (sourceData[idx] + sourceData[idx+1] + sourceData[idx+2]) / 765; // 0 a 1
            const finalSize = currentBaseSize * (0.8 + brightness * 0.4) * naturalJitter;

            // Cor exata do pixel
            ctx.fillStyle = `rgb(${sourceData[idx]},${sourceData[idx+1]},${sourceData[idx+2]})`;
            ctx.strokeStyle = ctx.fillStyle;

            const shape = shapesToUse[Math.floor(Math.random() * shapesToUse.length)];
            drawShape(x, y, finalSize, shape);
        }

        animationFrameId = requestAnimationFrame(loop);
    }

    function drawShape(x, y, size, s) {
        ctx.beginPath();
        if(s === 'circle') {
            ctx.arc(x, y, size/2, 0, Math.PI*2);
            ctx.fill();
        } 
        else if(s === 'square') {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.random() * Math.PI * 0.2);
            ctx.rect(-size/2, -size/2, size, size);
            ctx.fill();
            ctx.restore();
        } 
        else if(s === 'triangle') {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.random() * Math.PI * 0.5);
            const h = size * 0.866;
            ctx.moveTo(0, -h/2);
            ctx.lineTo(-size/2, h/2);
            ctx.lineTo(size/2, h/2);
            ctx.fill();
            ctx.restore();
        } 
        else if(s === 'line') {
            ctx.lineWidth = Math.max(1, size/4);
            const a = Math.random() * Math.PI * 2;
            ctx.moveTo(x - Math.cos(a)*size, y - Math.sin(a)*size);
            ctx.lineTo(x + Math.cos(a)*size, y + Math.sin(a)*size);
            ctx.stroke();
        }
    }

    // --- Utilitários ---
    
    function drawImageCover(ctx, img, w, h) {
        const r = Math.max(w / img.width, h / img.height);
        const nw = img.width * r;
        const nh = img.height * r;
        ctx.drawImage(img, (w - nw) / 2, (h - nh) / 2, nw, nh);
    }

    function map(v, a, b, c, d) {
        return c + ((v-a)/(b-a)) * (d-c);
    }

    // --- Event Listeners ---

    // Botões Principais
    document.getElementById('btnRandom').onclick = () => {
        config.currentMode = 'random';
        loadImage(`https://picsum.photos/1920/1080`, 0);
    };

    document.getElementById('btnToggleSearch').onclick = () => {
        ui.searchPanel.style.display = ui.searchPanel.style.display === 'block' ? 'none' : 'block';
    };

    const performSearch = () => {
        const val = ui.searchInput.value;
        if(val) searchImage(val);
    };
    document.getElementById('btnDoSearch').onclick = performSearch;
    ui.searchInput.onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    // Upload
    document.getElementById('fileInput').onchange = (e) => {
        const f = e.target.files[0];
        if(f) {
            config.currentMode = 'upload';
            setLoading(true, "Lendo arquivo...");
            const r = new FileReader();
            r.onload = (evt) => loadImage(evt.target.result, 0);
            r.readAsDataURL(f);
        }
    };

    // Controles
    document.getElementById('timeSelect').onchange = (e) => config.duration = parseInt(e.target.value);
    
    document.getElementById('speedSlider').oninput = (e) => {
        config.paintSpeed = parseInt(e.target.value);
        if(!config.evolutionMode) ui.speedVal.innerText = config.paintSpeed > 30 ? "Rápido" : "Normal";
    };

    document.getElementById('abstractionSlider').oninput = (e) => config.abstraction = parseInt(e.target.value);

    // Checkboxes de Formas
    document.querySelectorAll('#shapesContainer input').forEach(cb => {
        cb.onchange = () => {
            config.shapes = Array.from(document.querySelectorAll('#shapesContainer input:checked')).map(c => c.value);
        };
    });

    // Toggle Modo Automático
    ui.btnDetail.onclick = () => {
        config.evolutionMode = !config.evolutionMode;
        updateDetailBtnUI();
    };

    // Fullscreen e Download
    document.getElementById('btnFullscreen').onclick = () => {
        const el = document.getElementById('canvasContainer');
        if(el.requestFullscreen) el.requestFullscreen();
        else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    };

    document.getElementById('btnExitFS').onclick = () => {
        if(document.exitFullscreen) document.exitFullscreen();
        else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    };

    document.getElementById('btnDownload').onclick = () => {
        const a = document.createElement('a');
        a.download = `arte-geo-${Date.now()}.png`;
        a.href = canvas.toDataURL();
        a.click();
    };

    // Start
    init();
});
