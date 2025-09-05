import * as XLSX from 'xlsx';

/**
 * Экспорт финансовых данных в Excel
 * @param {Array} metrics - массив метрик
 * @param {Array} periods - массив периодов
 * @param {string} selectedYear - выбранный год
 * @param {string} selectedShop - выбранный магазин
 * @param {Array} shops - массив магазинов
 */
export const exportFinanceDataToExcel = (metrics, periods, selectedYear, selectedShop, shops) => {
    try {
        // Создаем рабочую книгу
        const wb = XLSX.utils.book_new();
        
        // Подготавливаем данные для Excel
        const rows = [];
        
        // Заголовок отчета
        const reportTitle = `Финансовый отчет за ${selectedYear} год`;
        const reportSubtitle = selectedShop === 'all' 
            ? 'Все магазины' 
            : (Array.isArray(shops) ? shops.find(s => s.id === parseInt(selectedShop))?.name : null) || 'Выбранный магазин';
        
        // Добавляем заголовки
        rows.push([reportTitle]);
        rows.push([reportSubtitle]);
        rows.push([]); // Пустая строка
        
        // Подготавливаем заголовки таблицы
        const firstHeaderRow = ['Период'];
        const secondHeaderRow = [''];
        
        // Добавляем заголовки метрик
        metrics.forEach(metric => {
            firstHeaderRow.push(`${metric.name} (${metric.unit})`, '', '');
            secondHeaderRow.push('План', 'Факт', 'Отклонение %');
        });
        
        rows.push(firstHeaderRow);
        rows.push(secondHeaderRow);
        
        // Фильтруем периоды по месяцам для отображения
        const monthPeriods = periods.filter(p => p.month !== null).sort((a, b) => a.month - b.month);
        
        // Добавляем данные по месяцам
        monthPeriods.forEach(period => {
            const monthNames = [
                'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
            ];
            
            const rowData = [monthNames[period.month - 1]];
            
            metrics.forEach(metric => {
                // Находим план и факт для этого периода и метрики
                const planValue = metric.planValues?.find(pv => pv.period_id === period.id);
                const actualValue = metric.actualValues?.find(av => av.period_id === period.id);
                
                const plan = planValue?.value || 0;
                const fact = actualValue?.value || 0;
                const deviation = plan > 0 ? ((fact - plan) / plan * 100).toFixed(1) : '0';
                
                rowData.push(
                    formatNumber(plan),
                    formatNumber(fact),
                    `${deviation}%`
                );
            });
            
            rows.push(rowData);
        });
        
        // Добавляем итоговую строку
        const totalRow = ['ИТОГО'];
        metrics.forEach(metric => {
            let totalPlan = 0;
            let totalFact = 0;
            
            monthPeriods.forEach(period => {
                const planValue = metric.planValues?.find(pv => pv.period_id === period.id);
                const actualValue = metric.actualValues?.find(av => av.period_id === period.id);
                
                totalPlan += planValue?.value || 0;
                totalFact += actualValue?.value || 0;
            });
            
            const totalDeviation = totalPlan > 0 ? ((totalFact - totalPlan) / totalPlan * 100).toFixed(1) : '0';
            
            totalRow.push(
                formatNumber(totalPlan),
                formatNumber(totalFact),
                `${totalDeviation}%`
            );
        });
        
        rows.push(totalRow);
        
        // Создаем лист
        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // Настройка объединения ячеек
        if (!ws['!merges']) ws['!merges'] = [];
        
        // Объединяем заголовки отчета
        const maxCols = Math.max(...rows.map(row => row.length));
        ws['!merges'].push(
            { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } },  // Заголовок
            { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } }   // Подзаголовок
        );
        
        // Объединяем заголовки метрик (каждая метрика занимает 3 колонки)
        let colIndex = 1;
        metrics.forEach((metric, index) => {
            ws['!merges'].push({
                s: { r: 3, c: colIndex },
                e: { r: 3, c: colIndex + 2 }
            });
            colIndex += 3;
        });
        
        // Объединяем ячейку "Период" по вертикали
        ws['!merges'].push({
            s: { r: 3, c: 0 },
            e: { r: 4, c: 0 }
        });
        
        // Устанавливаем ширину столбцов
        ws['!cols'] = Array(maxCols).fill({ wch: 15 });
        ws['!cols'][0] = { wch: 20 }; // Первый столбец шире
        
        // Применяем стили
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].length; j++) {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
                
                if (!ws[cellRef]) {
                    ws[cellRef] = { v: rows[i][j] || '' };
                }
                
                // Стили для разных типов ячеек
                if (i <= 1) {
                    // Заголовок отчета
                    ws[cellRef].s = {
                        font: { bold: true, sz: 14 },
                        alignment: { horizontal: 'center' }
                    };
                } else if (i === 3 || i === 4) {
                    // Заголовки таблицы
                    ws[cellRef].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: 'F1F5F9' } },
                        alignment: { horizontal: j === 0 ? 'left' : 'center' },
                        border: {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    };
                } else if (i === rows.length - 1) {
                    // Итоговая строка
                    ws[cellRef].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: 'F0F3FF' } },
                        border: {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    };
                } else if (i > 4) {
                    // Обычные строки данных
                    ws[cellRef].s = {
                        alignment: { horizontal: j === 0 ? 'left' : 'center' },
                        border: {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    };
                }
            }
        }
        
        // Добавляем лист в книгу
        XLSX.utils.book_append_sheet(wb, ws, 'Отчет');
        
        // Генерируем имя файла
        const date = new Date();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        const fileName = `Финансовый_отчет_${selectedYear}_${formattedDate}.xlsx`;
        
        // Сохраняем файл
        XLSX.writeFile(wb, fileName);
        
        return { success: true, fileName };
        
    } catch (error) {
        throw new Error('Ошибка при экспорте в Excel: ' + error.message);
    }
};

/**
 * Форматирование числа для отображения
 */
const formatNumber = (number) => {
    if (number === null || number === undefined || number === 0) return '0';
    return new Intl.NumberFormat('ru-RU').format(number);
}; 