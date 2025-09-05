import React from 'react';
import Button from '../components/ui/Button';

export default {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select', options: ['primary', 'secondary', 'danger'] },
      description: 'The variant of the button',
    },
    onClick: { action: 'clicked', description: 'Click handler' },
    disabled: {
      control: 'boolean',
      description: 'Is the button disabled?',
    },
    children: {
      control: 'text',
      description: 'Button label',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A reusable button component with several variants.',
      },
    },
  },
};

const Template = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  variant: 'primary',
  children: 'Primary Button',
};
Primary.storyName = 'Primary';

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary',
  children: 'Secondary Button',
};
Secondary.storyName = 'Secondary';

export const Danger = Template.bind({});
Danger.args = {
    variant: 'danger',
    children: 'Danger Button'
};
Danger.storyName = 'Danger';


export const Disabled = Template.bind({});
Disabled.args = {
  variant: 'primary',
  children: 'Disabled Button',
  disabled: true,
};
Disabled.storyName = 'Disabled';

export const WithIcon = Template.bind({});
WithIcon.args = {
  variant: 'primary',
  children: (
    <>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '8px' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      With Icon
    </>
  ),
};
WithIcon.storyName = 'With Icon'; 