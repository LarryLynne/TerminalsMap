const GAS_URL = "https://script.google.com/macros/s/AKfycbw165Z4yzi8xk8MEF5XnqE0LB2tANhIOBUcN-5nqG7bqoBBOTShYn2fAQQxh4S-Tj7mHw/exec"; 

let map;
let layers = { depo: L.layerGroup(), points: L.layerGroup() };
let depoData = [];
let pointsData = [];

// Ініціалізація карти
function initMap() {
    map = L.map('map', { zoomControl: true }).setView([50.4501, 30.5234], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OS' }).addTo(map);
    
    layers.depo.addTo(map);
    layers.points.addTo(map);

    // Автоматичне завантаження депо при старті
    fetchDepoData();
    
    // Вмикаємо можливість перетягування файлу
    setupDragAndDrop();
}

// Автоматичне завантаження Депо за посиланням
async function fetchDepoData() {
    try {
        const response = await fetch(GAS_URL);
        const json = await response.json();
        
        if (json.status === 'success') {
            depoData = json.data.depots || [];
            drawDepots();
        } else {
            console.error('Помилка завантаження депо: ' + json.message);
        }
    } catch (e) {
        console.error('Мережева помилка: ' + e.message);
    }
}

// Налаштування Drag & Drop для Excel (Відділення)
function setupDragAndDrop() {
    const mapContainer = document.getElementById('map');

    // Зупиняємо стандартну поведінку браузера
    mapContainer.addEventListener('dragover', (e) => e.preventDefault());

    // Обробка кинутого файлу
    mapContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        
        const file = e.dataTransfer.files[0];
        if (!file || !file.name.match(/\.(xlsx|xls)$/)) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            let targetSheetName = workbook.SheetNames.find(name => {
                const headers = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })[0] || [];
                return headers.includes('Широта') && headers.includes('Довгота');
            }) || workbook.SheetNames[0];

            const json = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName]);
            
            const getVal = (row, keys) => {
                for (let k in row) { if (keys.includes(k.trim())) return row[k]; }
                return undefined;
            };

            pointsData = json.map(r => ({
                id: String(getVal(r, ['Відділення (Вузол)', 'Вузол', 'ID']) || 'Без назви').trim(),
                lat: parseFloat(getVal(r, ['Широта'])) || 0,
                lng: parseFloat(getVal(r, ['Довгота'])) || 0
            })).filter(r => r.lat !== 0 && r.lng !== 0);
            
            drawPoints();
        };
        reader.readAsArrayBuffer(file);
    });
}

// Відмальовка Депо
function drawDepots() {
    layers.depo.clearLayers();
    
    depoData.forEach(d => {
        const iconHtml = `<div class="depo-icon" style="width: 100%; height: 100%;">${d['Вузол']}</div>`;
        const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [36, 36], iconAnchor: [18, 18] });
        const marker = L.marker([d['Широта'], d['Довгота']], { icon });
        
        marker.bindPopup(`<b>Депо: ${d['Вузол']}</b>`);
        layers.depo.addLayer(marker);
    });
}

// Відмальовка Відділень
function drawPoints() {
    layers.points.clearLayers();
    
    pointsData.forEach(p => {
        const iconHtml = `<div style="background:#64748b; width:12px; height:12px; border: 2px solid #fff; border-radius: 50%;"></div>`;
        const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [16, 16] });
        const marker = L.marker([p.lat, p.lng], { icon });
        
        marker.bindPopup(`<b>Відділення: ${p.id}</b>`);
        layers.points.addLayer(marker);
    });
}

// Запуск після завантаження сторінки
window.onload = initMap;