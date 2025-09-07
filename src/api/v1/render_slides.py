"""
API для рендеринга слайдов отчетов в изображения
Использует Puppeteer для серверного рендеринга
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Используем неинтерактивный бэкенд

router = APIRouter()

class SlideData(BaseModel):
    slide_id: str
    slide_type: str
    title: str
    content: Dict[str, Any]
    chart_data: Optional[List[Dict[str, Any]]] = None
    selected_metrics: Optional[List[str]] = None

class RenderSlidesRequest(BaseModel):
    report: Dict[str, Any]
    slide_data: List[tuple]  # [(slide_id, slide_data), ...]

class RenderSlidesResponse(BaseModel):
    success: bool
    images: List[str]  # Base64 encoded images
    error: Optional[str] = None

@router.post("/render-slides", response_model=RenderSlidesResponse)
async def render_slides(request: RenderSlidesRequest):
    """
    Рендерит все слайды отчета в изображения
    """
    try:
        print(f"🎨 Рендерим {len(request.slide_data)} слайдов на сервере")
        
        images = []
        
        for slide_id, slide_data in request.slide_data:
            try:
                # Находим слайд в отчете
                slide = None
                for s in request.report.get('slides', []):
                    if s.get('id') == slide_id:
                        slide = s
                        break
                
                if not slide:
                    print(f"⚠️ Слайд {slide_id} не найден в отчете")
                    continue
                
                # Рендерим слайд
                image_data = await render_single_slide(slide, slide_data)
                if image_data:
                    images.append(image_data)
                    print(f"✅ Слайд {slide_id} отрендерен")
                else:
                    print(f"❌ Не удалось отрендерить слайд {slide_id}")
                    
            except Exception as e:
                print(f"❌ Ошибка рендеринга слайда {slide_id}: {e}")
                continue
        
        print(f"🎨 Рендеринг завершен. Получено {len(images)} изображений")
        
        return RenderSlidesResponse(
            success=True,
            images=images
        )
        
    except Exception as e:
        print(f"❌ Ошибка рендеринга слайдов: {e}")
        return RenderSlidesResponse(
            success=False,
            images=[],
            error=str(e)
        )

async def render_single_slide(slide: Dict[str, Any], slide_data: Dict[str, Any]) -> Optional[str]:
    """
    Рендерит один слайд в изображение
    """
    try:
        slide_type = slide.get('type', '')
        title = slide.get('title', 'Без названия')
        
        if slide_type in ['finance-chart', 'analytics-chart']:
            return await render_chart_slide(title, slide_data)
        elif slide_type == 'comparison':
            return await render_comparison_slide(title, slide_data)
        elif slide_type == 'table':
            return await render_table_slide(title, slide_data)
        else:
            return await render_text_slide(title, slide.get('description', ''))
            
    except Exception as e:
        print(f"❌ Ошибка рендеринга слайда {slide.get('id', 'unknown')}: {e}")
        return None

async def render_chart_slide(title: str, slide_data: Dict[str, Any]) -> str:
    """
    Рендерит график
    """
    chart_data = slide_data.get('chartData', [])
    selected_metrics = slide_data.get('selectedMetrics', ['value'])
    
    if not chart_data:
        return await render_text_slide(title, "Нет данных для отображения")
    
    # Создаем график с matplotlib
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor('white')
    
    # Подготавливаем данные
    labels = [item.get('label', f'Период {i+1}') for i, item in enumerate(chart_data)]
    x = range(len(labels))
    
    # Рендерим метрики
    colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336']
    for i, metric in enumerate(selected_metrics):
        values = [item.get(metric, 0) for item in chart_data]
        ax.bar([pos + i * 0.8/len(selected_metrics) for pos in x], values, 
               width=0.8/len(selected_metrics), label=metric, color=colors[i % len(colors)])
    
    ax.set_title(title, fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('Период', fontsize=12)
    ax.set_ylabel('Значение', fontsize=12)
    ax.set_xticks([pos + 0.4 for pos in x])
    ax.set_xticklabels(labels, rotation=45, ha='right')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # Конвертируем в base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    buffer.seek(0)
    image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    plt.close(fig)
    
    return f"data:image/png;base64,{image_data}"

async def render_comparison_slide(title: str, slide_data: Dict[str, Any]) -> str:
    """
    Рендерит слайд сравнения
    """
    chart_data = slide_data.get('chartData', [])
    
    if not chart_data:
        return await render_text_slide(title, "Нет данных для отображения")
    
    # Создаем изображение с таблицей
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        # Используем системный шрифт
        title_font = ImageFont.truetype("arial.ttf", 24)
        header_font = ImageFont.truetype("arial.ttf", 16)
        cell_font = ImageFont.truetype("arial.ttf", 12)
    except:
        # Fallback на стандартный шрифт
        title_font = ImageFont.load_default()
        header_font = ImageFont.load_default()
        cell_font = ImageFont.load_default()
    
    # Заголовок
    draw.text((400, 30), title, fill='black', font=title_font, anchor='mm')
    
    # Заголовки таблицы
    columns = list(chart_data[0].keys()) if chart_data else []
    if 'label' in columns:
        columns.remove('label')
        columns.insert(0, 'label')
    
    # Рисуем таблицу
    y_start = 100
    row_height = 40
    col_width = 150
    
    # Заголовки
    for i, col in enumerate(columns):
        x = 50 + i * col_width
        draw.rectangle([x, y_start, x + col_width, y_start + row_height], outline='black')
        draw.text((x + col_width//2, y_start + row_height//2), col, 
                 fill='black', font=header_font, anchor='mm')
    
    # Данные
    for row_idx, row in enumerate(chart_data):
        y = y_start + (row_idx + 1) * row_height
        for col_idx, col in enumerate(columns):
            x = 50 + col_idx * col_width
            draw.rectangle([x, y, x + col_width, y + row_height], outline='black')
            value = str(row.get(col, 0))
            draw.text((x + col_width//2, y + row_height//2), value, 
                     fill='black', font=cell_font, anchor='mm')
    
    # Конвертируем в base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{image_data}"

async def render_table_slide(title: str, slide_data: Dict[str, Any]) -> str:
    """
    Рендерит табличный слайд
    """
    return await render_comparison_slide(title, slide_data)

async def render_text_slide(title: str, content: str) -> str:
    """
    Рендерит текстовый слайд
    """
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        title_font = ImageFont.truetype("arial.ttf", 24)
        content_font = ImageFont.truetype("arial.ttf", 16)
    except:
        title_font = ImageFont.load_default()
        content_font = ImageFont.load_default()
    
    # Заголовок
    draw.text((400, 200), title, fill='black', font=title_font, anchor='mm')
    
    # Содержимое
    draw.text((400, 300), content, fill='black', font=content_font, anchor='mm')
    
    # Конвертируем в base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{image_data}"
