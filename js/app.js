//barq.khit.be
(function() {
    const defaultState = {
        mode: 'barcode',
        format: 'EAN13',
        digits: '5901234567890',
        shape: 'classic',
        color: '#000000',
        qrContent: '',
        qrEcl: 'M',
        qrColor: '#000000',
        qrHistory: []
    };
    const savedStateStr = localStorage.getItem('barq_state');
    const savedState = savedStateStr ? JSON.parse(savedStateStr) : {};
    const state = {
        ...defaultState,
        ...savedState,
        customShapeMask: null,
        qrLogoDataUrl: null,
        isBatchGenerating: false
    };
    const MAX_HISTORY = 5;
    function saveState() {
        const stateToSave = {
            mode: state.mode,
            format: state.format,
            digits: state.digits,
            shape: state.shape,
            color: state.color,
            qrContent: state.qrContent,
            qrEcl: state.qrEcl,
            qrColor: state.qrColor,
            qrHistory: state.qrHistory
        };
        localStorage.setItem('barq_state', JSON.stringify(stateToSave));
    }
    const SHAPES = {
    classic: { name: 'CLASSIC', path: 'M 0 0 L 300 0 L 300 300 L 0 300 Z' },
    bolt: { name: 'BOLT', url: './shapes/bolt.svg' },
    box: { name: 'BOX', url: './shapes/box.svg' },
    camera: { name: 'CAMERA', url: './shapes/camera.svg' },
    cat: { name: 'CAT', url: './shapes/cat.svg' },
    cheese: { name: 'CHEESE', url: './shapes/cheese.svg' },
    chef: { name: 'CHEF', url: './shapes/chef.svg' },
    cloud: { name: 'CLOUD', url: './shapes/cloud.svg' },
    compass: { name: 'COMPASS', url: './shapes/compass.svg' },
    heart: { name: 'HEART', url: './shapes/heart.svg' },
    mail: { name: 'MAIL', url: './shapes/mail.svg' },
    star: { name: 'STAR', url: './shapes/star.svg' },
    thumbs_up: { name: 'THUMBS UP', url: './shapes/thumbs-up.svg' },
    custom: { name: 'CUSTOM', path: 'M 0 0 L 300 0 L 300 300 L 0 300 Z' }
    };
    let shapeKeys = Object.keys(SHAPES);
    const COLORS = [
        {name:'Black', code:'#000000'},
        {name:'Barq Blue', code:'#003DA5'},
        {name:'Crimson', code:'#C41230'},
        {name:'Forest', code:'#1B5E20'},
        {name:'Orange', code:'#E65100'}
    ];
    const barcodeModeBtn = document.getElementById('barcodeModeBtn');
    const qrModeBtn = document.getElementById('qrModeBtn');
    const barcodeModeDiv = document.getElementById('barcodeMode');
    const qrModeDiv = document.getElementById('qrMode');
    const digitInput = document.getElementById('digitInput');
    const inputFeedback = document.getElementById('inputFeedback');
    const formatRow = document.getElementById('formatRow');
    const shapeGrid = document.getElementById('shapeGrid');
    const colorRow = document.getElementById('colorRow');
    const barcodeSvg = document.getElementById('barcodeSvg');
    const previewContainer = document.getElementById('previewContainerBarcode');
    const copyBtn = document.getElementById('copyBtn');
    const customSvgUpload = document.getElementById('customSvgUpload');
    const batchInput = document.getElementById('batchInput');
    const batchGenerateBtn = document.getElementById('batchGenerateBtn');
    const qrContentInput = document.getElementById('qrContentInput');
    const qrInputFeedback = document.getElementById('qrInputFeedback');
    const qrErrorRow = document.getElementById('qrErrorRow');
    const qrColorRow = document.getElementById('qrColorRow');
    const qrSvg = document.getElementById('qrSvg');
    const qrPreviewContainer = document.getElementById('qrPreviewContainer');
    const qrCopyBtn = document.getElementById('qrCopyBtn');
    const qrHistorySection = document.getElementById('qrHistorySection');
    const qrHistoryList = document.getElementById('qrHistoryList');
    const qrLogoUpload = document.getElementById('qrLogoUpload');
    const clearQrLogo = document.getElementById('clearQrLogo');
    const exportFormatBarcode = document.getElementById('exportFormatBarcode');
    const exportSizeBarcode = document.getElementById('exportSizeBarcode');
    const downloadBarcodeBtn = document.getElementById('downloadBarcodeBtn');
    const customColorPickerBarcode = document.getElementById('customColorPickerBarcode');
    const exportFormatQR = document.getElementById('exportFormatQR');
    const exportSizeQR = document.getElementById('exportSizeQR');
    const downloadQRBtn = document.getElementById('downloadQRBtn');
    const customColorPickerQR = document.getElementById('customColorPickerQR');
    const toast = document.getElementById('toast');
    const exportCanvas = document.getElementById('exportCanvas');
    function switchMode(mode) {
        state.mode = mode;
        barcodeModeBtn.classList.toggle('active', mode === 'barcode');
        qrModeBtn.classList.toggle('active', mode === 'qrcode');
        barcodeModeDiv.style.display = mode === 'barcode' ? 'block' : 'none';
        qrModeDiv.style.display = mode === 'qrcode' ? 'block' : 'none';
        saveState();
    }
    barcodeModeBtn.addEventListener('click', () => switchMode('barcode'));
    qrModeBtn.addEventListener('click', () => switchMode('qrcode'));
    function normalizeUrl(input) {
        let trimmed = (input || '').trim();
        if (!trimmed) return trimmed;

        if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(trimmed) && !/\s/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
            return 'https://' + trimmed;
        }

        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }

        return trimmed;
    }
    function calcEAN13Check(d12) { let sum=0; for(let i=0;i<12;i++) sum+=parseInt(d12[i]||0)*(i%2===0?1:3); return String((10-(sum%10))%10); }
    function calcEAN8Check(d7) { let sum=0; for(let i=0;i<7;i++) sum+=parseInt(d7[i]||0)*(i%2===0?3:1); return String((10-(sum%10))%10); }
    function calcUPCACheck(d11) { let sum=0; for(let i=0;i<11;i++) sum+=parseInt(d11[i]||0)*(i%2===0?3:1); return String((10-(sum%10))%10); }
    function validateDigits(digits, format) {
        if (!digits) return { valid: false, message: 'Enter digits' };
        if (format === 'EAN13') return /^\d{12,13}$/.test(digits) ? { valid: true, message: '13-digit global retail standard (GTIN)' } : { valid: false, message: 'EAN-13 requires 12-13 digits' };
        if (format === 'EAN8') return /^\d{7,8}$/.test(digits) ? { valid: true, message: '8-digit compact retail code' } : { valid: false, message: 'EAN-8 requires 7-8 digits' };
        if (format === 'UPCA') return /^\d{11,12}$/.test(digits) ? { valid: true, message: '12-digit US/Canada retail standard (UPC-A)' } : { valid: false, message: 'UPC-A requires 11-12 digits' };
        if (format === 'CODE128') return digits.length>0 ? { valid: true, message: 'Alphanumeric logistics & supply chain' } : { valid: false, message: 'Enter alphanumeric data' };
        return { valid: false, message: 'Unknown format' };
    }
    function updateValidationUI() {
        const r = validateDigits(state.digits, state.format);
        digitInput.classList.remove('valid','invalid');
        inputFeedback.classList.remove('error','success');
        if (state.digits.length) {
            digitInput.classList.add(r.valid?'valid':'invalid');
            inputFeedback.classList.add(r.valid?'success':'error');
        }
        inputFeedback.textContent = r.message;
    }
    function getJsBarcodeFormat() {
        if (state.format === 'UPCA') return 'UPC'; if (state.format === 'CODE128') return 'CODE128'; if (state.format === 'EAN8') return 'EAN8'; return 'EAN13';
    }
    function encodeToCanvas(digits) {
        if (!digits) return null;
        try {
            const c=document.createElement('canvas'); c.width=300; c.height=100;
            JsBarcode(c, digits, { format: getJsBarcodeFormat(), width:2, height:80, displayValue:false, margin:0, background:'#ffffff', lineColor:'#000000', flat:true });
            return c;
        } catch(e) { return null; }
    }
    function extractBars(canvas) {
        if (!canvas) return [];
        const ctx=canvas.getContext('2d'), data=ctx.getImageData(0,0,canvas.width,canvas.height).data, w=canvas.width, bars=[];
        let inBar=false, start=0;
        for(let x=0;x<w;x++) { const idx=(50*w+x)*4; if(data[idx]<128) { if(!inBar){inBar=true;start=x;} } else if(inBar){inBar=false; bars.push({x:start,width:x-start});} }
        if(inBar) bars.push({x:start,width:w-start});
        return bars;
    }
    function getActiveShapeMaskDef() {
        if (state.customShapeMask) {
            return `<mask id="artMask">
                        <rect x="0" y="0" width="300" height="340" fill="black"/>
                        <image href="${state.customShapeMask.src}" x="${state.customShapeMask.x}" y="${state.customShapeMask.y}" width="${state.customShapeMask.w}" height="${state.customShapeMask.h}"/>
                    </mask>`;
        }
        return `<clipPath id="artClip"><path d="${SHAPES.classic.path}" transform="translate(5 0) scale(1.05)" fill-rule="evenodd"/></clipPath>`;
    }
    function renderBarcode() {
        if (!state.digits) { barcodeSvg.innerHTML='<text x="150" y="170" text-anchor="middle" font-family="\'Space Mono\',monospace" font-size="14" fill="#aaa">ENTER DIGITS</text>'; saveState(); return; }
        let rt=state.digits;
        if(state.format==='EAN13'){ rt=rt.padEnd(12,'0').slice(0,12); rt+=calcEAN13Check(rt); }
        else if(state.format==='EAN8'){ rt=rt.padEnd(7,'0').slice(0,7); rt+=calcEAN8Check(rt); }
        else if(state.format==='UPCA'){ rt=rt.padEnd(11,'0').slice(0,11); rt+=calcUPCACheck(rt); }
        const canvas=encodeToCanvas(rt); if(!canvas) { barcodeSvg.innerHTML='<text x="150" y="170" text-anchor="middle" font-family="\'Space Mono\',monospace" font-size="14" fill="#c44">ENCODING ERROR</text>'; saveState(); return; }
        const bars=extractBars(canvas); if(!bars.length) { saveState(); return; }
        const minX=bars[0].x, maxX=bars[bars.length-1].x+bars[bars.length-1].width, scaleX=260/(maxX-minX||1), offsetX=25;
        const artBottom=260, scanTop=270, scanH=32, guardExtra=12, textY=scanTop+scanH+16;
        const fontStr=`font-family="'Space Mono',monospace" font-size="18" font-weight="700" fill="${state.color}" letter-spacing="2"`;
        const isEAN13=(state.format==='EAN13'&&bars.length===30), isEAN8=(state.format==='EAN8'&&bars.length===22), isUPCA=(state.format==='UPCA'&&bars.length===30);
        let svg='';
        if(state.shape!=='classic') {
            const defs = getActiveShapeMaskDef();
            const maskAttr = state.customShapeMask ? `mask="url(#artMask)"` : `clip-path="url(#artClip)"`;
            svg+=`<defs>${defs}</defs><g ${maskAttr}>`;
        }
        bars.forEach(b=>{ const sx=(b.x-minX)*scaleX+offsetX; svg+=`<rect x="${sx}" y="10" width="${Math.max(1,b.width*scaleX)}" height="${artBottom-10}" fill="${state.color}" shape-rendering="crispEdges"/>`; });
        if(state.shape!=='classic') svg+=`</g>`;
        bars.forEach((b,i)=>{ const sx=(b.x-minX)*scaleX+offsetX; let h=scanH; if((isEAN13||isUPCA)&&(i===0||i===1||i===14||i===15||i===28||i===29)) h+=guardExtra; if(isEAN8&&(i===0||i===1||i===10||i===11||i===20||i===21)) h+=guardExtra; svg+=`<rect x="${sx}" y="${scanTop}" width="${Math.max(1.2,b.width*scaleX)}" height="${h}" fill="${state.color}" shape-rendering="crispEdges"/>`; });
        if(isEAN13||isUPCA){ const d=rt, mw=260/95, sx=offsetX; svg+=`<text x="${sx-mw*5}" y="${textY}" text-anchor="end" ${fontStr}>${d[0]}</text><text x="${sx+mw*24}" y="${textY}" text-anchor="middle" ${fontStr}>${d.slice(1,7)}</text><text x="${sx+mw*71}" y="${textY}" text-anchor="middle" ${fontStr}>${d.slice(7,13)}</text>`; }
        else if(isEAN8){ const d=rt, mw=260/67, sx=offsetX; svg+=`<text x="${sx+mw*17}" y="${textY}" text-anchor="middle" ${fontStr}>${d.slice(0,4)}</text><text x="${sx+mw*50}" y="${textY}" text-anchor="middle" ${fontStr}>${d.slice(4,8)}</text>`; }
        else { svg+=`<text x="150" y="${textY}" text-anchor="middle" ${fontStr}>${state.digits.length>18?state.digits.slice(0,18)+'\u2026':state.digits}</text>`; }
        barcodeSvg.innerHTML=svg;
        updateValidationUI();
        saveState();
    }
    function renderQR() {
        const rawContent = qrContentInput.value || '';
        const content = normalizeUrl(rawContent) || '';
        state.qrContent = rawContent;
        if (!rawContent.trim()) {
            qrSvg.innerHTML = '<text x="150" y="150" text-anchor="middle" font-family="\'Space Mono\',monospace" font-size="14" fill="#aaa">ENTER URL OR TEXT</text>';
            qrInputFeedback.textContent = 'Enter URL, text, or any data';
            qrInputFeedback.className = 'input-feedback';
            qrContentInput.classList.remove('valid','invalid');
            updateClearLogoButton();
            saveState();
            return;
        }
        try {
            const hiddenDiv = document.createElement('div');
            hiddenDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(hiddenDiv);
            new QRCode(hiddenDiv, { text: content, width: 300, height: 300, colorDark: state.qrColor, colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel[state.qrEcl] });
            setTimeout(() => {
                if (qrContentInput.value !== rawContent) return;
                const canvas = hiddenDiv.querySelector('canvas');
                if(hiddenDiv.parentNode) document.body.removeChild(hiddenDiv);
                let svgContent = '';
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const pixels = ctx.getImageData(0, 0, 300, 300).data;
                    let minX = 300, maxX = 0, minY = 300, maxY = 0;
                    for (let y = 0; y < 300; y++) {
                        for (let x = 0; x < 300; x++) {
                            const idx = (y * 300 + x) * 4;
                            const isDark = pixels[idx+3] > 128 && (pixels[idx] + pixels[idx+1] + pixels[idx+2]) < 750;

                            if (isDark) {
                                if (x < minX) minX = x; if (x > maxX) maxX = x;
                                if (y < minY) minY = y; if (y > maxY) maxY = y;
                            }
                        }
                    }
                    minX = Math.max(0, minX - 4); maxX = Math.min(299, maxX + 4);
                    minY = Math.max(0, minY - 4); maxY = Math.min(299, maxY + 4);
                    const qrSize = Math.max(maxX - minX + 1, maxY - minY + 1);
                    const offsetX = Math.round((300 - qrSize) / 2);
                    const offsetY = Math.round((300 - qrSize) / 2);
                    svgContent += `<rect x="0" y="0" width="300" height="300" fill="#ffffff"/>`;
                    const step = Math.max(1, Math.floor(qrSize / 100));
                    for (let y = minY; y <= maxY; y += step) {
                        for (let x = minX; x <= maxX; x += step) {
                            const idx = (Math.round(y) * 300 + Math.round(x)) * 4;
                            const isDark = pixels[idx+3] > 128 && (pixels[idx] + pixels[idx+1] + pixels[idx+2]) < 750;

                            if (isDark) {
                                svgContent += `<rect x="${offsetX + (x - minX)}" y="${offsetY + (y - minY)}" width="${step}" height="${step}" fill="${state.qrColor}" shape-rendering="crispEdges"/>`;
                            }
                        }
                    }
                }
                if (state.qrLogoDataUrl && canvas) {
                    const lW = state.qrLogoDataUrl.w;
                    const lH = state.qrLogoDataUrl.h;
                    const lx = 150 - lW/2;
                    const ly = 150 - lH/2;
                    svgContent += `<image href="${state.qrLogoDataUrl.src}" x="${lx}" y="${ly}" width="${lW}" height="${lH}" preserveAspectRatio="xMidYMid meet"/>`;
                }
                qrSvg.innerHTML = svgContent;
                qrInputFeedback.textContent = 'QR code generated · scans as: ' + (content?.length > 40 ? content.slice(0,40)+'...' : (content || ''));
                qrInputFeedback.className = 'input-feedback success';
                qrContentInput.classList.add('valid');
                qrContentInput.classList.remove('invalid');
                updateClearLogoButton();
                saveState();
            }, 100);
        } catch(e) {
            qrSvg.innerHTML = '<text x="150" y="150" text-anchor="middle" font-family="\'Space Mono\',monospace" font-size="14" fill="#c44">ENCODING ERROR</text>';
            qrInputFeedback.textContent = 'Error generating QR code';
            qrInputFeedback.className = 'input-feedback error';
        }
    }
    function updateClearLogoButton() { clearQrLogo.style.display = state.qrLogoDataUrl ? 'inline-block' : 'none'; }
    async function getQrSvgString() {
        return new Promise((resolve) => {
            const rawContent = state.qrContent || '';
            const content = normalizeUrl(rawContent) || '';
            if (!content.trim()) { resolve(''); return; }
            const hiddenDiv = document.createElement('div');
            hiddenDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(hiddenDiv);
            new QRCode(hiddenDiv, { text: content, width: 300, height: 300, colorDark: state.qrColor, colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel[state.qrEcl] });
            setTimeout(() => {
                const canvas = hiddenDiv.querySelector('canvas');
                let svgContent = '';
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const pixels = ctx.getImageData(0, 0, 300, 300).data;
                    let minX = 300, maxX = 0, minY = 300, maxY = 0;
                    for (let y = 0; y < 300; y++) {
                        for (let x = 0; x < 300; x++) {
                            const idx = (y * 300 + x) * 4;
                            const isDark = pixels[idx+3] > 128 && (pixels[idx] + pixels[idx+1] + pixels[idx+2]) < 750;
                            if (isDark) {
                                if (x < minX) minX = x; if (x > maxX) maxX = x;
                                if (y < minY) minY = y; if (y > maxY) maxY = y;
                            }
                        }
                    }
                    minX = Math.max(0, minX-4); maxX = Math.min(299, maxX+4);
                    minY = Math.max(0, minY-4); maxY = Math.min(299, maxY+4);
                    const qrSize = Math.max(maxX-minX+1, maxY-minY+1);
                    const offsetX = Math.round((300-qrSize)/2), offsetY = Math.round((300-qrSize)/2);
                    const step = Math.max(1, Math.floor(qrSize/100));
                    svgContent += `<rect x="0" y="0" width="300" height="300" fill="#ffffff"/>`;
                    for (let y = minY; y <= maxY; y += step) {
                        for (let x = minX; x <= maxX; x += step) {
                            const idx = (Math.round(y) * 300 + Math.round(x)) * 4;
                            const isDark = pixels[idx+3] > 128 && (pixels[idx] + pixels[idx+1] + pixels[idx+2]) < 750;
                            if (isDark) {
                                svgContent += `<rect x="${offsetX+(x-minX)}" y="${offsetY+(y-minY)}" width="${step}" height="${step}" fill="${state.qrColor}" shape-rendering="crispEdges"/>`;
                            }
                        }
                    }
                    if (state.qrLogoDataUrl) {
                        const lW = state.qrLogoDataUrl.w;
                        const lH = state.qrLogoDataUrl.h;
                        const lx = 150 - lW/2;
                        const ly = 150 - lH/2;
                        svgContent += `<image href="${state.qrLogoDataUrl.src}" x="${lx}" y="${ly}" width="${lW}" height="${lH}" preserveAspectRatio="xMidYMid meet"/>`;
                    }
                }
                if(hiddenDiv.parentNode) document.body.removeChild(hiddenDiv);
                resolve(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">${svgContent}</svg>`);
            }, 100);
        });
    }
    function addQRHistory() {
        if (!state.qrContent || !state.qrContent.trim()) return;
        const entry = { content: state.qrContent, ecl: state.qrEcl, color: state.qrColor };
        state.qrHistory = [entry, ...state.qrHistory.filter(e=>e.content!==state.qrContent)].slice(0,MAX_HISTORY);
        saveState();
        renderQRHistory();
    }
    function renderQRHistory() {
        qrHistorySection.style.display = state.qrHistory.length?'block':'none';
        qrHistoryList.innerHTML = '';
        state.qrHistory.forEach(e=>{
            const b=document.createElement('button');
            b.className='history-item';
            const safeContent = e.content || '';
            b.textContent = safeContent.slice(0,25) + (safeContent.length > 25 ? '…' : '');
            b.onclick=()=>{
                state.qrContent=safeContent; state.qrEcl=e.ecl; state.qrColor=e.color;
                qrContentInput.value=safeContent;
                updateQRErrorButtons(); updateQRColorDots(); renderQR(); animate(qrPreviewContainer);
            };
            qrHistoryList.appendChild(b);
        });
    }
    function generateStencilFromImageSource(src, callback) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxDim = 260;
            let w = img.width, h = img.height;
            if (w > h) { h = (h / w) * maxDim; w = maxDim; } else { w = (w / h) * maxDim; h = maxDim; }
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                    const brightness = (r + g + b) / 3;
                    if (a > 50 && brightness < 200) {
                        data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
                    } else {
                        data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                const maskDataUrl = canvas.toDataURL('image/png');
                const offsetX = 25 + (260 - w) / 2;
                const offsetY = 10 + (260 - h) / 2;
                callback({ src: maskDataUrl, w, h, x: offsetX, y: offsetY });
            } catch (err) {
                showToast("CANVAS BLOCKED (USE LIVE SERVER)");
                callback(null);
            }
        };
        img.onerror = () => { showToast("FAILED TO LOAD SVG"); callback(null); };
        img.src = src;
    }
    function buildShapes() {
        shapeGrid.innerHTML='';
        shapeKeys.filter(k=>k!=='custom').forEach(k=>{
            const b=document.createElement('button');
            b.className='shape-btn'; b.dataset.shape=k;
            if(k===state.shape) b.classList.add('active-shape');
            b.textContent=SHAPES[k].name;
            b.onclick=()=>{
                state.shape=k; updateActiveShapeButton();
                if (SHAPES[k].url) {
                    generateStencilFromImageSource(SHAPES[k].url, (maskData) => {
                        if (maskData) { state.customShapeMask = maskData; renderBarcode(); animate(previewContainer); }
                        else { state.shape = 'classic'; updateActiveShapeButton(); renderBarcode(); animate(previewContainer); }
                    });
                } else {
                    state.customShapeMask=null; renderBarcode(); animate(previewContainer);
                }
            };
            shapeGrid.appendChild(b);
        });
        const cb=document.createElement('button');
        cb.className='shape-btn'; cb.dataset.shape='custom';
        if(state.shape==='custom') cb.classList.add('active-shape');
        cb.textContent='+ UPLOAD';
        cb.onclick=()=>{
            state.shape='custom';
            state.customShapeMask=null;
            updateActiveShapeButton();
            customSvgUpload.click();
        };
        shapeGrid.appendChild(cb);
    }
    function updateActiveShapeButton() {
        document.querySelectorAll('.shape-btn').forEach(b=>b.classList.toggle('active-shape',b.dataset.shape===state.shape));
    }
    function buildColors() {
        colorRow.innerHTML='';
        COLORS.forEach(c=>{
            const d=document.createElement('button');
            d.className='color-dot';
            if(c.code===state.color) d.classList.add('selected');
            d.style.backgroundColor=c.code; d.title=c.name;
            d.onclick=()=>{ state.color=c.code; customColorPickerBarcode.value=c.code; updateColorDots(); renderBarcode(); };
            colorRow.appendChild(d);
        });
    }
    function buildQRColors() {
        qrColorRow.innerHTML='';
        COLORS.forEach(c=>{
            const d=document.createElement('button');
            d.className='color-dot';
            if(c.code===state.qrColor) d.classList.add('selected');
            d.style.backgroundColor=c.code; d.title=c.name;
            d.onclick=()=>{ state.qrColor=c.code; customColorPickerQR.value=c.code; updateQRColorDots(); renderQR(); };
            qrColorRow.appendChild(d);
        });
    }
    function updateColorDots() {
        document.querySelectorAll('#colorRow .color-dot').forEach(d=>{
            const bg=d.style.backgroundColor;
            const isSel=bg===state.color||(bg.startsWith('rgb')&&rgbToHex(bg)===state.color);
            d.classList.toggle('selected',isSel);
        });
        customColorPickerBarcode.value = state.color;
    }
    function updateQRColorDots() {
        document.querySelectorAll('#qrColorRow .color-dot').forEach(d=>{
            const bg=d.style.backgroundColor;
            const isSel=bg===state.qrColor||(bg.startsWith('rgb')&&rgbToHex(bg)===state.qrColor);
            d.classList.toggle('selected',isSel);
        });
        customColorPickerQR.value = state.qrColor;
    }
    function updateFormatButtons() { formatRow.querySelectorAll('.fmt-btn').forEach(b=>b.classList.toggle('active',b.dataset.format===state.format)); }
    function updateQRErrorButtons() { qrErrorRow.querySelectorAll('.fmt-btn').forEach(b=>b.classList.toggle('active',b.dataset.ecl===state.qrEcl)); }
    function animate(el) { el.classList.remove('animate-draw'); void el.offsetWidth; el.classList.add('animate-draw'); }
    function rgbToHex(c) { if(c.startsWith('#')) return c; const m=c.match(/[\d.]+/g); if(!m||m.length<3) return c; return '#'+m.slice(0,3).map(x=>parseInt(x).toString(16).padStart(2,'0')).join(''); }
    customColorPickerBarcode.addEventListener('input', (e) => { state.color = e.target.value; updateColorDots(); renderBarcode(); });
    customColorPickerQR.addEventListener('input', (e) => { state.qrColor = e.target.value; updateQRColorDots(); renderQR(); });
    function downloadFile(content, filename, type) {
        const b=new Blob([content],{type}), u=URL.createObjectURL(b), a=document.createElement('a');
        a.href=u; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
    }
    function getBarcodeSvgString() {
        const clone=barcodeSvg.cloneNode(true);
        clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
let s=new XMLSerializer().serializeToString(clone);
if(!s.includes('xmlns=')) s=s.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'); return s;
    }
    function exportBarcodeRaster(format, size) {
        return new Promise(resolve=>{
            const svgStr=getBarcodeSvgString(), img=new Image(), u=URL.createObjectURL(new Blob([svgStr],{type:'image/svg+xml;charset=utf-8'}));
            img.onload=()=>{
                const w=size, h=Math.round(size*(340/300)); exportCanvas.width=w; exportCanvas.height=h;
                const ctx=exportCanvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
                exportCanvas.toBlob(blob=>{ URL.revokeObjectURL(u); resolve(blob); }, format==='jpg'?'image/jpeg':'image/png',0.95);
            };
            img.src=u;
        });
    }
    function doBarcodeExport() {
        if(!state.digits){showToast('ENTER DIGITS');return;}
        const exportFormat = exportFormatBarcode.value;
        const exportSize = parseInt(exportSizeBarcode.value);
        if(exportFormat==='svg'){
            downloadFile(getBarcodeSvgString(),`barq-${state.shape}-${state.digits.slice(0,8)}.svg`,'image/svg+xml'); showToast('SVG DOWNLOADED');
        } else {
            exportBarcodeRaster(exportFormat,exportSize).then(blob=>{ downloadFile(blob,`barq-${state.shape}-${state.digits.slice(0,8)}.${exportFormat}`,exportFormat==='jpg'?'image/jpeg':'image/png'); showToast(`${exportFormat.toUpperCase()} DOWNLOADED`); });
        }
    }
    async function doQRExport() {
        if(!state.qrContent || !state.qrContent.trim()){showToast('ENTER CONTENT');return;}
        const qrExportFormat = exportFormatQR.value;
        const qrExportSize = parseInt(exportSizeQR.value);
        const svgStr = await getQrSvgString();
        if(qrExportFormat==='svg'){
            downloadFile(svgStr,`barq-qr-${state.qrContent.slice(0,15).replace(/[^a-zA-Z0-9]/g,'_')}.svg`,'image/svg+xml'); showToast('SVG DOWNLOADED');
        } else {
            const img=new Image(), u=URL.createObjectURL(new Blob([svgStr],{type:'image/svg+xml;charset=utf-8'}));
            img.onload=()=>{
                const s=qrExportSize; exportCanvas.width=s; exportCanvas.height=s;
                const ctx=exportCanvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,s,s); ctx.drawImage(img,0,0,s,s);
                exportCanvas.toBlob(blob=>{ URL.revokeObjectURL(u); downloadFile(blob,`barq-qr-${state.qrContent.slice(0,15).replace(/[^a-zA-Z0-9]/g,'_')}.${qrExportFormat}`,qrExportFormat==='jpg'?'image/jpeg':'image/png'); showToast(`${qrExportFormat.toUpperCase()} DOWNLOADED`); },qrExportFormat==='jpg'?'image/jpeg':'image/png',0.95);
            };
            img.src=u;
        }
        addQRHistory();
    }
    formatRow.addEventListener('click',e=>{
        const b=e.target.closest('.fmt-btn'); if(!b)return;
        state.format=b.dataset.format; updateFormatButtons();
        if(state.format!=='CODE128') state.digits=state.digits.replace(/[^0-9]/g,'');
        if(state.format==='EAN13'){ digitInput.maxLength=13; state.digits=state.digits.padEnd(12,'0').slice(0,12); state.digits+=calcEAN13Check(state.digits); }
        else if(state.format==='EAN8'){ digitInput.maxLength=8; state.digits=state.digits.padEnd(7,'0').slice(0,7); state.digits+=calcEAN8Check(state.digits); }
        else if(state.format==='UPCA'){ digitInput.maxLength=12; state.digits=state.digits.padEnd(11,'0').slice(0,11); state.digits+=calcUPCACheck(state.digits); }
        else{ digitInput.maxLength=30; if(state.digits.length>30) state.digits=state.digits.slice(0,30); }
        digitInput.value=state.digits; updateValidationUI(); renderBarcode(); animate(previewContainer);
    });
    digitInput.addEventListener('input',()=>{
        let v=digitInput.value;
        if(state.format!=='CODE128') v=v.replace(/[^0-9]/g,'');
        if(state.format==='EAN13'&&v.length>13) v=v.slice(0,13);
        if(state.format==='EAN8'&&v.length>8) v=v.slice(0,8);
        if(state.format==='UPCA'&&v.length>12) v=v.slice(0,12);
        if(state.format==='CODE128'&&v.length>30) v=v.slice(0,30);
        if(v!==state.digits){ state.digits=v; digitInput.value=v; updateValidationUI(); renderBarcode(); }
    });
    downloadBarcodeBtn.addEventListener('click', doBarcodeExport);
    downloadQRBtn.addEventListener('click', doQRExport);
    copyBtn.addEventListener('click',()=>{ if(!state.digits){showToast('ENTER DIGITS');return;} navigator.clipboard.writeText(getBarcodeSvgString()).then(()=>showToast('SVG COPIED')).catch(()=>showToast('COPY FAILED')); });
    qrCopyBtn.addEventListener('click',async()=>{ if(!state.qrContent || !state.qrContent.trim()){showToast('ENTER CONTENT');return;} const s=await getQrSvgString(); navigator.clipboard.writeText(s).then(()=>showToast('SVG COPIED')).catch(()=>showToast('COPY FAILED')); addQRHistory(); });
    customSvgUpload.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            generateStencilFromImageSource(ev.target.result, (maskData) => {
                if (maskData) { state.customShapeMask = maskData; state.shape = 'custom'; updateActiveShapeButton(); renderBarcode(); animate(previewContainer); showToast('STENCIL GENERATED'); }
            });
        };
        reader.readAsDataURL(file);
    });
    batchGenerateBtn.addEventListener('click',async()=>{
        if (state.isBatchGenerating) return;
        const lines=batchInput.value.split(/[\n,]+/).map(l=>l.trim()).filter(l=>l.length);
        if(!lines.length){showToast('NO DATA');return;}
        if(lines.length>100){showToast('MAX 100');return;}
        state.isBatchGenerating = true; batchGenerateBtn.classList.add('loading'); batchGenerateBtn.textContent = 'Generating...';
        showToast(`Generating ${lines.length} barcodes...`);
        try {
            const zip=new JSZip();
            for(let i=0;i<lines.length;i++){
                let rt=lines[i];
                if(state.format==='EAN13'){ rt=rt.padEnd(12,'0').slice(0,12); rt+=calcEAN13Check(rt); }
                else if(state.format==='EAN8'){ rt=rt.padEnd(7,'0').slice(0,7); rt+=calcEAN8Check(rt); }
                else if(state.format==='UPCA'){ rt=rt.padEnd(11,'0').slice(0,11); rt+=calcUPCACheck(rt); }
                const orig=state.digits; state.digits=rt; renderBarcode();
                const svgStr=getBarcodeSvgString(); state.digits=orig;
                zip.file(`barcode_${i+1}_${rt.slice(0,8)}.svg`,svgStr);
            }
            const zb=await zip.generateAsync({type:'blob'}); downloadFile(zb,'barq-batch.zip','application/zip'); showToast(`ZIP DOWNLOADED (${lines.length} files)`);
        } catch(err) { showToast('BATCH ERROR'); }
        state.isBatchGenerating = false; batchGenerateBtn.classList.remove('loading'); batchGenerateBtn.textContent = 'Generate All (ZIP)'; renderBarcode();
    });
    qrContentInput.addEventListener('input', () => { renderQR(); });
    qrErrorRow.addEventListener('click', e => { const b=e.target.closest('.fmt-btn'); if(!b)return; state.qrEcl=b.dataset.ecl; updateQRErrorButtons(); renderQR(); });
    qrLogoUpload.addEventListener('change', e => {
        const f = e.target.files[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 60; let w = img.width, h = img.height;
                if (w > h) { h = (h/w)*maxDim; w = maxDim; } else { w = (w/h)*maxDim; h = maxDim; }
                state.qrLogoDataUrl = { src: img.src, w, h };
                updateClearLogoButton(); renderQR(); showToast('LOGO ADDED');
            };
            img.src = ev.target.result;
        }; reader.readAsDataURL(f);
    });
    clearQrLogo.addEventListener('click', () => { state.qrLogoDataUrl = null; updateClearLogoButton(); renderQR(); showToast('LOGO REMOVED'); });
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (state.mode === 'barcode') doBarcodeExport(); else doQRExport(); } });
    function showToast(msg) { toast.textContent=msg; toast.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>toast.classList.remove('show'),2000); }
    function init() {
        if (state.shape === 'custom') state.shape = 'classic';
        switchMode(state.mode);
        digitInput.value = state.digits;
        qrContentInput.value = state.qrContent;
        updateFormatButtons();
        buildShapes(); updateActiveShapeButton();
        buildColors(); buildQRColors();
        updateColorDots(); updateQRColorDots();
        updateQRErrorButtons(); updateClearLogoButton();
        renderQRHistory();
        if (SHAPES[state.shape] && SHAPES[state.shape].url) {
            generateStencilFromImageSource(SHAPES[state.shape].url, (maskData) => {
                if (maskData) { state.customShapeMask = maskData; renderBarcode(); animate(previewContainer); }
                else { state.shape = 'classic'; updateActiveShapeButton(); renderBarcode(); animate(previewContainer); }
            });
        } else {
            renderBarcode(); animate(previewContainer);
        }
        renderQR();
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
            });
        }
    }
    init();
})();
