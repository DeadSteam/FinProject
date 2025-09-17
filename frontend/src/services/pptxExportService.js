// Сервис экспорта отчетов в PowerPoint (PptxGenJS)
// Поддерживает многослайдовость и несколько графиков на одном слайде

import reportsService from './reportsService';

let PptxGenJSInstance = null;

async function getPptx() {
    if (PptxGenJSInstance) return PptxGenJSInstance;
    const mod = await import('pptxgenjs');
    // поддержка разных форматов экспорта (ESM/CJS)
    PptxGenJSInstance = mod && (mod.default || mod.PptxGenJS || mod);
    return PptxGenJSInstance;
}

function computeLayoutRects(count, orientation = 'vertical') {
    // 16:9, слайд по умолчанию 10 x 5.625in
    // Возвращает массив прямоугольников { x, y, w, h }
    const margin = 0.3; // поля
    const full = { x: margin, y: margin + 0.4, w: 10 - margin * 2, h: 5.625 - margin * 2 - 0.4 };

    if (count <= 1) return [full];
    if (count === 2) {
        const gap = 0.2;
        if (orientation === 'vertical') {
            const w = full.w;
            const h = (full.h - gap) / 2;
            return [
                { x: full.x, y: full.y, w, h },
                { x: full.x, y: full.y + h + gap, w, h },
            ];
        }
        const w = (full.w - gap) / 2;
        const h = full.h;
        return [
            { x: full.x, y: full.y, w, h },
            { x: full.x + w + gap, y: full.y, w, h },
        ];
    }
    if (count === 3) {
        const gap = 0.2;
        const w = (full.w - gap) / 2;
        const h = (full.h - gap) / 2;
        return [
            { x: full.x, y: full.y, w, h },
            { x: full.x + w + gap, y: full.y, w, h },
            { x: full.x + (full.w - w) / 2, y: full.y + h + gap, w, h },
        ];
    }
    // 4 и более — берём первые 4 в сетке 2x2
    const gap = 0.2;
    const w = (full.w - gap) / 2;
    const h = (full.h - gap) / 2;
    return [
        { x: full.x, y: full.y, w, h },
        { x: full.x + w + gap, y: full.y, w, h },
        { x: full.x, y: full.y + h + gap, w, h },
        { x: full.x + w + gap, y: full.y + h + gap, w, h },
    ];
}

function addTitle(slide, title) {
    if (!title) return;
    slide.addText(title, {
        x: 0.5,
        y: 0.15,
        w: 9,
        h: 0.4,
        fontSize: 16,
        bold: true,
        color: '363636',
    });
}

async function addSlideWithCharts(pptx, slideDef, images, orientation = 'vertical') {
    const slide = pptx.addSlide();
    addTitle(slide, slideDef.title);

    const rects = computeLayoutRects(images.length, orientation);
    images.slice(0, rects.length).forEach((dataUrl, idx) => {
        const r = rects[idx];
        slide.addImage({ data: dataUrl, x: r.x, y: r.y, w: r.w, h: r.h });
    });
}

// exportReportToPptx удален: используйте exportReportFromImages

// Экспорт напрямую из набора изображений, подготовленных снаружи (ReportPreview)
export async function exportReportFromImages(report, imagesBySlide, order, filename = 'report.pptx') {
    return await exportReportFromImagesAndTables(report, imagesBySlide, new Map(), order, filename);
}

// Экспорт с поддержкой и графиков, и таблиц
export async function exportReportFromImagesAndTables(report, imagesBySlide, tablesBySlide, order, filename = 'report.pptx') {
    const Pptx = await getPptx();
    const pptx = new Pptx();
    pptx.layout = 'LAYOUT_16x9';

    // Страхуем имя файла на проде
    const safeFileName = String(filename || 'report.pptx').replace(/[^\w\-. ]+/g, '').replace(/\s+/g, ' ').trim() || 'report.pptx';

    const ids = order && order.length ? order : (report.slides || []).map(s => s.id);
    for (const slideId of ids) {
        const slide = (report.slides || []).find(s => slideId === s.id || slideId.startsWith(`${s.id}__part`)) || { id: slideId, title: report.title };
        const imgs = imagesBySlide.get(slideId) || [];
        const tables = tablesBySlide.get(slideId) || [];

        // Если нет ни графиков, ни таблиц
        if (!imgs.length && !tables.length) {
            const s = pptx.addSlide();
            addTitle(s, slide.title || '');
            s.addText('Графики и таблицы не были найдены в DOM (не отображались).', { x: 1, y: 2.5, w: 8, h: 0.6, color: '888888' });
            continue;
        }

        // Если есть только таблицы
        if (!imgs.length && tables.length > 0) {
            const chunkSize = 2;
            for (let i = 0; i < tables.length; i += chunkSize) {
                const chunk = tables.slice(i, i + chunkSize);
                await addSlideWithCharts(pptx, slide, chunk, 'vertical');
            }
            continue;
        }

        // Если есть только графики
        if (imgs.length > 0 && !tables.length) {
            const chunkSize = 2;
            for (let i = 0; i < imgs.length; i += chunkSize) {
                const chunk = imgs.slice(i, i + chunkSize);
                await addSlideWithCharts(pptx, slide, chunk, 'vertical');
            }
            continue;
        }

        // Если есть и графики, и таблицы - объединяем их
        const allContent = [...imgs, ...tables];
        const chunkSize = 2;
        for (let i = 0; i < allContent.length; i += chunkSize) {
            const chunk = allContent.slice(i, i + chunkSize);
            await addSlideWithCharts(pptx, slide, chunk, 'vertical');
        }
    }

    // Пытаемся сохранить через стандартный метод; при ошибке используем fallback
    try {
        await pptx.writeFile({ fileName: safeFileName });
    } catch (err) {
        try {
            const arr = await pptx.write('arraybuffer');
            const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = safeFileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            // Отдаём осмысленную ошибку наверх (UI покажет уведомление)
            throw new Error('Экспорт PPTX не удался. Проверьте разрешение на скачивание файлов в браузере и повторите попытку.');
        }
    }
}

export default {
    exportReportFromImages,
    exportReportFromImagesAndTables,
};


