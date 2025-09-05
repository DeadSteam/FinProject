import React from 'react';
import Card from '../components/ui/Card';

export default {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    children: {
      control: 'text',
      description: 'Content of the card',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    clickable: {
      control: 'boolean',
      description: 'Makes the card appear clickable',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler for the card',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A versatile card component for containing content.',
      },
    },
  },
};

const Template = (args) => <Card {...args} />;

export const Default = Template.bind({});
Default.args = {
  children: 'This is a default card. It contains some text content to demonstrate its basic appearance.',
};
Default.storyName = 'Default';

export const Clickable = Template.bind({});
Clickable.args = {
  children: 'This card is clickable. Hover over it to see the effect. The onClick action is logged in the Actions tab.',
  clickable: true,
};
Clickable.storyName = 'Clickable';

export const WithCustomClass = Template.bind({});
WithCustomClass.args = {
  children: 'This card has a custom CSS class for additional styling. Check the DOM to see the applied class.',
  className: 'custom-card-style',
};
WithCustomClass.storyName = 'With Custom Style';

// To demonstrate the custom class, you might want to add a global style in .storybook/preview.js
// .custom-card-style {
//   background-color: #eef;
//   border: 1px solid #ccf;
// } 