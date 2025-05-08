"""
Скрипт для исправления ошибки индентации в файле src/service/finance.py
"""

def fix_indentation():
    # Путь к файлу
    file_path = 'src/service/finance.py'
    
    # Чтение содержимого файла
    with open(file_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    # Ищем строку с try: и фиксируем следующую строку
    for i in range(len(lines)):
        if 'try:' in lines[i] and i + 1 < len(lines):
            # Проверяем отступ следующей строки
            current_indent = len(lines[i]) - len(lines[i].lstrip())
            next_line = lines[i + 1]
            next_indent = len(next_line) - len(next_line.lstrip())
            
            # Если отступ следующей строки меньше или равен текущему, добавляем отступ
            if next_indent <= current_indent:
                # Добавляем 4 пробела к отступу
                lines[i + 1] = ' ' * (current_indent + 4) + next_line.lstrip()
                print(f"Исправлена строка {i + 2}: добавлен отступ")
    
    # Записываем исправленное содержимое обратно в файл
    with open(file_path, 'w', encoding='utf-8') as file:
        file.writelines(lines)
    
    print(f"Файл {file_path} успешно исправлен")

if __name__ == "__main__":
    fix_indentation() 