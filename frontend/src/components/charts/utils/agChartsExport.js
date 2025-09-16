/**
 * Утилиты для экспорта графиков AG Charts в высоком качестве
 * Поддерживает SVG и PNG экспорт с сохранением стилей
 */

import { exportConfig } from '../config/agChartsConfig';

export const exportToSVG = async (chart, options = {}) => {
  if (!chart || (typeof chart.export !== 'function' && !chart.api)) {
    throw new Error('Неверный экземпляр графика');
  }

  const exportOptions = {
    ...exportConfig.svg,
    ...options
  };

  try {
    const exporter = chart.export ? chart : chart.api;
    const svgData = await exporter.export('svg', exportOptions);
    return svgData;
  } catch (error) {
    console.error('Ошибка экспорта в SVG:', error);
    throw error;
  }
};

export const exportToPNG = async (chart, options = {}) => {
  if (!chart || (typeof chart.export !== 'function' && !chart.api)) {
    throw new Error('Неверный экземпляр графика');
  }

  const exportOptions = {
    ...exportConfig.png,
    ...options
  };

  try {
    const exporter = chart.export ? chart : chart.api;
    const pngData = await exporter.export('png', exportOptions);
    return pngData;
  } catch (error) {
    console.error('Ошибка экспорта в PNG:', error);
    throw error;
  }
};

// Экспорт в PDF удален

export const exportChart = async (chart, format = 'svg', options = {}) => {
  if (!chart || (typeof chart.export !== 'function' && !chart.api)) {
    throw new Error('Неверный экземпляр графика');
  }

  const exportOptions = {
    ...exportConfig[format],
    ...options
  };

  try {
    const exporter = chart.export ? chart : chart.api;
    const data = await exporter.export(format, exportOptions);
    return data;
  } catch (error) {
    console.error(`Ошибка экспорта в ${format.toUpperCase()}:`, error);
    throw error;
  }
};

export const createSVGElement = (svgData, options = {}) => {
  const {
    width = 800,
    height = 600,
    className = 'exported-chart'
  } = options;

  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
  const svgElement = svgDoc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Не удалось создать SVG элемент');
  }

  svgElement.setAttribute('width', width);
  svgElement.setAttribute('height', height);
  svgElement.setAttribute('class', className);

  return svgElement;
};

export const createCanvasFromSVG = async (svgData, options = {}) => {
  const {
    width = 800,
    height = 600,
    scale = 2
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Ошибка загрузки SVG изображения'));
    };
    img.src = url;
  });
};

export const downloadFile = (data, filename, mimeType) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportAndDownload = async (chart, format = 'svg', filename = 'chart', options = {}) => {
  try {
    const data = await exportChart(chart, format, options);
    const mimeTypes = { svg: 'image/svg+xml', png: 'image/png' };
    const extensions = { svg: '.svg', png: '.png' };
    const mimeType = mimeTypes[format];
    const extension = extensions[format];
    if (!mimeType || !extension) throw new Error(`Неподдерживаемый формат: ${format}`);
    const fullFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;
    downloadFile(data, fullFilename, mimeType);
    return data;
  } catch (error) {
    console.error('Ошибка экспорта и скачивания:', error);
    throw error;
  }
};

// createImageForPPTX удален

// createSVGForPPTX удален

export const batchExport = async (charts, format = 'svg', options = {}) => {
  if (!Array.isArray(charts) || charts.length === 0) {
    throw new Error('Неверный массив графиков');
  }
  const exportPromises = charts.map((chart, index) => exportChart(chart, format, { ...options, filename: `chart_${index + 1}` }));
  try {
    const results = await Promise.all(exportPromises);
    return results;
  } catch (error) {
    console.error('Ошибка пакетного экспорта:', error);
    throw error;
  }
};

export const createZipArchive = async (charts, format = 'svg', options = {}) => {
  const JSZip = (await import('jszip')).default;
  try {
    const zip = new JSZip();
    const exportedData = await batchExport(charts, format, options);
    exportedData.forEach((data, index) => {
      const filename = `chart_${index + 1}.${format}`;
      zip.file(filename, data);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return zipBlob;
  } catch (error) {
    console.error('Ошибка создания ZIP архива:', error);
    throw error;
  }
};

export default {
  exportToSVG,
  exportToPNG,
  exportChart,
  createSVGElement,
  createCanvasFromSVG,
  downloadFile,
  exportAndDownload,
  // createImageForPPTX удален
  // createSVGForPPTX удален
  batchExport,
  createZipArchive
};

