/**
 * Unit тесты для Button компонента
 * @description Тестирует функциональность enhanced Button из Phase 6
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Button from '../Button';

describe('Button component', () => {
  describe('основная функциональность', () => {
    test('должен рендериться с базовыми props', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    test('должен обрабатывать клики', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('должен быть disabled когда передан disabled prop', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('не должен вызывать onClick когда disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('варианты (variants)', () => {
    test('должен применять класс для primary варианта', () => {
      render(<Button variant="primary">Primary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
    });

    test('должен применять класс для secondary варианта', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-secondary');
    });

    test('должен применять класс для danger варианта', () => {
      render(<Button variant="danger">Danger</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('danger');
    });

    test('должен применять класс для success варианта', () => {
      render(<Button variant="success">Success</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('success');
    });

    test('должен использовать primary как default variant', () => {
      render(<Button>Default</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
    });
  });

  describe('размеры (sizes)', () => {
    test('должен применять класс для xs размера', () => {
      render(<Button size="xs">Extra Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('xs');
    });

    test('должен применять класс для xl размера', () => {
      render(<Button size="xl">Extra Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('xl');
    });

    test('должен использовать md как default size', () => {
      render(<Button>Default</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('md');
    });
  });

  describe('модификаторы', () => {
    test('должен применять outline класс', () => {
      render(<Button outline>Outline</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('outline');
    });

    test('должен применять fullWidth класс', () => {
      render(<Button fullWidth>Full Width</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('fullWidth');
    });

    test('должен применять rounded класс', () => {
      render(<Button rounded>Rounded</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded');
    });

    test('должен применять loading класс и показывать спиннер', () => {
      render(<Button loading>Loading</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('loading');
      expect(button).toBeDisabled();
      
      // Проверяем наличие спиннера (может быть через aria-label или data-testid)
      const spinner = button.querySelector('.spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('иконки', () => {
    test('должен рендерить left иконку', () => {
      const LeftIcon = () => <span data-testid="left-icon">←</span>;
      
      render(
        <Button leftIcon={<LeftIcon />}>
          With Left Icon
        </Button>
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('With Left Icon')).toBeInTheDocument();
    });

    test('должен рендерить right иконку', () => {
      const RightIcon = () => <span data-testid="right-icon">→</span>;
      
      render(
        <Button rightIcon={<RightIcon />}>
          With Right Icon
        </Button>
      );
      
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('With Right Icon')).toBeInTheDocument();
    });

    test('должен рендерить только иконку без текста', () => {
      const Icon = () => <span data-testid="icon">★</span>;
      
      render(<Button leftIcon={<Icon />} />);
      
      const button = screen.getByRole('button');
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(button).toHaveClass('iconOnly');
    });
  });

  describe('accessibility', () => {
    test('должен поддерживать custom aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      
      const button = screen.getByLabelText('Custom label');
      expect(button).toBeInTheDocument();
    });

    test('должен поддерживать aria-describedby', () => {
      render(
        <div>
          <Button aria-describedby="description">Button</Button>
          <div id="description">Button description</div>
        </div>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });

    test('должен быть фокусируемым', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    test('не должен быть фокусируемым когда disabled', () => {
      render(<Button disabled>Not Focusable</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).not.toHaveFocus();
    });
  });

  describe('типы кнопок', () => {
    test('должен поддерживать type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    test('должен использовать type="button" по умолчанию', () => {
      render(<Button>Default</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('комбинации свойств', () => {
    test('должен корректно комбинировать все классы', () => {
      render(
        <Button
          variant="danger"
          size="lg"
          outline
          fullWidth
          rounded
        >
          Combined
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('danger');
      expect(button).toHaveClass('lg');
      expect(button).toHaveClass('outline');
      expect(button).toHaveClass('fullWidth');
      expect(button).toHaveClass('rounded');
    });

    test('loading должен переопределять другие состояния', () => {
      render(
        <Button loading disabled={false}>
          Loading Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled(); // loading переопределяет disabled=false
      expect(button).toHaveClass('loading');
    });
  });
}); 