"""
Константы приложения.
"""

# Размеры полей в базе данных
DB_NAME_LENGTH = 255
DB_ADDRESS_LENGTH = 500
DB_UNIT_LENGTH = 50
DB_NUMERIC_PRECISION = 12
DB_NUMERIC_SCALE = 2

# Ограничения для периодов
QUARTER_MIN = 1
QUARTER_MAX = 4
MONTH_MIN = 1
MONTH_MAX = 12

# Римские цифры
ROMAN_NUMERALS = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV"
}

# Названия месяцев
MONTH_NAMES = {
    1: "январь",
    2: "февраль",
    3: "март",
    4: "апрель",
    5: "май",
    6: "июнь",
    7: "июль",
    8: "август",
    9: "сентябрь",
    10: "октябрь",
    11: "ноябрь",
    12: "декабрь"
} 