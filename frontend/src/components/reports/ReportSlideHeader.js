import React from 'react';

const ReportSlideHeader = ({ title, description }) => (
    <div className="slide-header">
        <h2 className="slide-title">{title}</h2>
        {description && <p className="slide-description">{description}</p>}
    </div>
);

export default ReportSlideHeader;


