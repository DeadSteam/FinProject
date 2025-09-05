module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'plugin:jsx-a11y/recommended', 'plugin:storybook/recommended'],
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'import'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      alias: {
        map: [
          ['@', './src'],
          ['@components', './src/components'],
          ['@pages', './src/pages'],
          ['@services', './src/services'],
          ['@utils', './src/utils'],
          ['@hooks', './src/hooks'],
          ['@styles', './src/styles'],
          ['@contexts', './src/contexts']
        ],
        extensions: ['.js', '.jsx', '.json']
      }
    }
  },
  rules: {
    // ============ SOLID PRINCIPLES RULES ============
    
    // Single Responsibility Principle (SRP)
    'max-lines': ['error', { 
      max: 200, 
      skipBlankLines: true, 
      skipComments: true 
    }],
    'max-lines-per-function': ['error', { 
      max: 50, 
      skipBlankLines: true, 
      skipComments: true 
    }],
    'complexity': ['error', 10],
    'max-params': ['error', 3],
    'max-depth': ['error', 4],
    
    // Open/Closed Principle (OCP) - поощряем композицию
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    
    // Liskov Substitution Principle (LSP) - строгая типизация
    'no-implicit-coercion': 'error',
    'eqeqeq': ['error', 'always'],
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Interface Segregation Principle (ISP)
    'import/no-unused-modules': 'warn',
    
    // Dependency Inversion Principle (DIP)
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    
    // ============ REACT SPECIFIC RULES ============
    
    // Компонентная архитектура
    'react/prop-types': 'error',
    'react/no-unused-prop-types': 'error',
    'react/require-default-props': 'error',
    'react/no-unused-state': 'error',
    'react/prefer-stateless-function': 'error',
    
    // Hooks правила
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // JSX правила
    'react/jsx-uses-react': 'off', // React 17+
    'react/react-in-jsx-scope': 'off', // React 17+
    'react/jsx-fragments': ['error', 'syntax'],
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-curly-brace-presence': ['error', 'never'],
    'react/jsx-no-useless-fragment': 'error',
    
    // ============ CODE QUALITY RULES ============
    
    // Чистый код
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-magic-numbers': ['warn', { 
      ignore: [0, 1, -1, 2, 100, 1000],
      ignoreArrayIndexes: true 
    }],
    
    // Именование
    'camelcase': ['error', { 
      properties: 'never',
      ignoreDestructuring: false 
    }],
    'id-length': ['error', { 
      min: 2, 
      exceptions: ['i', 'j', 'k', 'e', 'x', 'y'] 
    }],
    
    // Функции
    'arrow-spacing': 'error',
    'prefer-arrow-callback': 'error',
    'func-style': ['error', 'expression'],
    'no-nested-ternary': 'error',
    
    // Объекты и массивы
    'dot-notation': 'error',
    'no-array-constructor': 'error',
    'prefer-destructuring': ['error', {
      array: true,
      object: true
    }],
    
    // Импорты
    'import/order': ['error', {
      groups: [
        'builtin',
        'external', 
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
    
    // ============ ACCESSIBILITY RULES ============
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'warn',
    
    // ============ PERFORMANCE RULES ============
    'react/jsx-no-bind': ['error', {
      allowArrowFunctions: true,
      allowBind: false,
      ignoreRefs: true
    }],
    'react/jsx-no-constructed-context-values': 'error'
  },
  
  // Настройки для разных типов файлов
  overrides: [
    {
      // Тестовые файлы
      files: ['**/__tests__/**/*', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'no-magic-numbers': 'off'
      }
    },
    {
      // Конфигурационные файлы
      files: ['**/config/**/*', '**/*.config.js'],
      rules: {
        'max-lines': 'off',
        'no-magic-numbers': 'off'
      }
    },
    {
      // Хуки - особые правила
      files: ['**/hooks/**/*'],
      rules: {
        'max-lines-per-function': ['error', { max: 100 }]
      }
    }
  ]
};