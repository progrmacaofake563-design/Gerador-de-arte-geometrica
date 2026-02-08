document.addEventListener('DOMContentLoaded', () => {
    
    // --- Configuração ---
    const config = {
        width: 1920,
        height: 1080,
        shapes: ['circle', 'square'], // Padrão da imagem (Bolas e Cubos)
        paintSpeed: 40,
        duration: 30000,
        isRunning: false,
        evolutionMode: true, // Começa ligado igual na foto
        abstraction: 50
    };

    // --- Elementos UI ---
    const els = {
        canvas: document.getElementById('artCanvas'),
        startScreen: document.getElementById('startScreen'),
        msgBox: document.querySelector('.message-box'),
        spinner: document.querySelector('.spinner'),
        
        // Sidebar
        btnRandom: document.getElementById('btnRandom'),
        btnSearchToggle: document.getElementById('btnSearchToggle'),
        searchPanel: document.getElementById('searchPanel'),
        searchInput: document.getElementById('searchInput'),
        btnDoSearch: document.getElementById('btnDoSearch'),
        fileInput: document.getElementById('fileInput'),
        trendingList: document.getElementById('trendingList'),
        shapeChecks: document.querySelectorAll('.shape-toggle input'),

        // Bottom Bar
        timeSelect: document.getElementById('timeSelect'),
        btnEvo: document.getElementById('btnEvoMode'),
        speedSlider: document.getElementById('speedSlider'),
        scaleGroup: document.getElementById('scaleGroup'),
        scaleSlider: document.getElementById('abstractionSlider'),
        speedDisplay: document.getElementById('speedDisplay'),
        btnFs: document.getElementById('btnFullscreen'),
        btnDl: document.getElementById('btnDownload')
    };

    const ctx = els.canvas.getContext('2d', { willReadFrequently: true });
    let animationId = null;
    let sourceData = null;
    let startTime = 0;
    let originalImg = new Image();
    originalImg.crossOrigin = "Anonymous";

    // --- Inicialização ---
    function init() {
        els.canvas.width = config.width;
        els.canvas.height = config.height;
        
        // Estado inicial: tela preta com mensagem
        setWaitState(true, "Escolha uma opção à esquerda para começar");
        
        renderTrending();
        updateEvoUI();
    }

    // --- Controle de Estado (UI) ---
    function setWaitState(active, msg = "") {
        if (active) {
            els.startScreen.classList.add('active');
            els.msgBox.innerText = msg;
            els.spinner.style.display = msg.includes("Processando") || msg.includes("Carregando") ? "block" : "none";
            config.isRunning = false;
        } else {
            els.startScreen.classList.remove('active');
        }
    }

    function updateEvoUI() {
        if (config.evolutionMode) {
            els.btnEvo.classList.add('active');
            els.btnEvo.querySelector('.status').innerText = "LIGADO";
            els.scaleGroup.classList.add('disabled');
            els.speedDisplay.innerText = "Auto";
        } else {
            els.btnEvo.classList.remove('active');
            els.btnEvo.querySelector('.status').innerText = "DESLIGADO";
            els.scaleGroup.classList.remove('disabled');
            els.speedDisplay.innerText = config.paintSpeed;
        }
    }

    function renderTrending() {
        const trends = [
            { name: "Cyberpunk", tag: "cyberpunk city" },
            { name: "Natureza", tag: "forest nature" },
            { name: "Retrato", tag: "portrait face" },
            { name: "Espaço", tag: "galaxy stars" },
            { name: "Arquitetura", tag: "modern architecture" }
        ];

        els.trendingList.innerHTML = '';
        trends.forEach((t, i) => {
            const div = document.createElement('div');
            div.className = 'trend-item';
            div.innerHTML = `
                <span>#${i+1} ${t.name}</span>
                <span class="play-text">TOCAR</span>
            `;
            div.onclick = () => loadUrl(`https://loremflickr.com/1920/1080/${encodeURIComponent(t.tag)}`);
            els.trendingList.appendChild(div);
        });
    }

    // --- Lógica de Carregamento ---
    function loadUrl(url) {
        setWaitState(true, "Carregando imagem...");
        
        // Hack para forçar reload da imagem e não pegar cache
        const uniqueUrl = url + (url.includes('?') ? '&' : '?') + `t=${Date.now()}`;
        
        originalImg.onload = () => {
            startDrawing();
        };
        originalImg.onerror = () => {
            setWaitState(true, "Erro ao carregar imagem. Tente outra.");
        };
        originalImg.src = uniqueUrl;
    }

    function startDrawing() {
        // Extrai pixels
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = config.width;
        tempCanvas.height = config.height;
        const tCtx = tempCanvas.getContext('2d');
        
        // Object-fit cover manual
        const ratio = Math.max(config.width / originalImg.width, config.height / originalImg.height);
        const nw = originalImg.width * ratio;
        const nh = originalImg.height * ratio;
        tCtx.drawImage(originalImg, (config.width-nw)/2, (config.height-nh)/2, nw, nh);
        
        sourceData = tCtx.getImageData(0, 0, config.width, config.height).data;

        // Limpa e inicia
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, config.width, config.height);
        
        setWaitState(false);
        config.isRunning = true;
        startTime = Date.now();
        
        if (animationId) cancelAnimationFrame(animationId);
        loop();
    }

    // --- Loop Principal (Core) ---
    function loop() {
        if (!config.isRunning) return;

        const elapsed = Date.now() - startTime;
        
        // Checa tempo
        if (elapsed > config.duration) {
            config.isRunning = false;
            // Opcional: reiniciar ou parar
            return; 
        }

        const progress = elapsed / config.duration;
        
        // Define tamanho e velocidade
        let size, loops;
        
        if (config.evolutionMode) {
            // Lógica matemática evolutiva
            // Começa grande (grosso) e diminui (detalhe)
            let sizeFactor = Math.max(0, 1 - (progress * 1.2)); // decai
            size = 5 + (sizeFactor * 80); 
            loops = 5 + (progress * 100); // acelera quantidade conforme fica menor
        } else {
            // Modo Manual
            size = map(config.abstraction, 1, 100, 2, 100);
            loops = config.paintSpeed;
        }

        // Desenha múltiplos shapes por frame
        for (let i = 0; i < loops; i++) {
            const x = Math.floor(Math.random() * config.width);
            const y = Math.floor(Math.random() * config.height);
            const idx = (y * config.width + x) * 4;

            const r = sourceData[idx];
            const g = sourceData[idx+1];
            const b = sourceData[idx+2];
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.strokeStyle = ctx.fillStyle;

            // Escolhe forma aleatória entre as ativas
            if (config.shapes.length > 0) {
                const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];
                drawShape(x, y, size, shape);
            }
        }

        animationId = requestAnimationFrame(loop);
    }

    function drawShape(x, y, size, type) {
        ctx.beginPath();
        // Variação natural de tamanho
        const s = size * (0.5 + Math.random()); 

        if (type === 'circle') {
            ctx.arc(x, y, s/2, 0, Math.PI*2);
            ctx.fill();
        } else if (type === 'square') {
            ctx.rect(x - s/2, y - s/2, s, s);
            ctx.fill();
        } else if (type === 'triangle') {
            ctx.moveTo(x, y - s/2);
            ctx.lineTo(x + s/2, y + s/2);
            ctx.lineTo(x - s/2, y + s/2);
            ctx.fill();
        } else if (type === 'line') {
            const angle = Math.random() * Math.PI;
            ctx.lineWidth = Math.max(1, s/5);
            ctx.moveTo(x - Math.cos(angle)*s, y - Math.sin(angle)*s);
            ctx.lineTo(x + Math.cos(angle)*s, y + Math.sin(angle)*s);
            ctx.stroke();
        }
    }

    function map(v, n1, n2, m1, m2) { return m1 + (m2 - m1) * (v - n1) / (n2 - n1); }

    // --- Event Listeners ---

    // 1. Fontes
    els.btnRandom.onclick = () => loadUrl('https://picsum.photos/1920/1080');
    
    els.btnSearchToggle.onclick = () => {
        els.searchPanel.classList.toggle('hidden');
        if(!els.searchPanel.classList.contains('hidden')) els.searchInput.focus();
    };
    
    els.btnDoSearch.onclick = () => {
        const val = els.searchInput.value;
        if(val) loadUrl(`https://loremflickr.com/1920/1080/${encodeURIComponent(val)}`);
    };
    
    els.fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            originalImg.src = evt.target.result;
            originalImg.onload = () => startDrawing();
        };
        setWaitState(true, "Lendo arquivo...");
        reader.readAsDataURL(file);
    };

    // 2. Formas
    els.shapeChecks.forEach(chk => {
        chk.onchange = () => {
            config.shapes = Array.from(els.shapeChecks).filter(c => c.checked).map(c => c.value);
        };
    });

    // 3. Controles Inferiores
    els.timeSelect.onchange = (e) => config.duration = parseInt(e.target.value);
    
    els.btnEvo.onclick = () => {
        config.evolutionMode = !config.evolutionMode;
        updateEvoUI();
    };

    els.speedSlider.oninput = (e) => {
        config.paintSpeed = parseInt(e.target.value);
        if(!config.evolutionMode) els.speedDisplay.innerText = config.paintSpeed;
    };

    els.scaleSlider.oninput = (e) => config.abstraction = parseInt(e.target.value);

    // 4. Ações
    els.btnFs.onclick = () => {
        if (!document.fullscreenElement) els.canvas.parentElement.requestFullscreen();
        else document.exitFullscreen();
    };

    els.btnDl.onclick = () => {
        const a = document.createElement('a');
        a.download = 'arte-geometrica.png';
        a.href = els.canvas.toDataURL();
        a.click();
    };

    init();
});
