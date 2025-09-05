import React from 'react';
import styles from './{{ComponentName}}.module.css';

/**
 * JSDoc description for the component.
 * 
 * @param {object} props - The props for the component.
 * @param {string} props.exampleProp - An example prop.
 */
function {{ComponentName}}({ exampleProp }) {
  return (
    <div className={styles.wrapper}>
      <h1>{{ComponentName}}</h1>
      <p>{exampleProp}</p>
    </div>
  );
}

export default {{ComponentName}}; 