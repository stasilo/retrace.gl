import React from 'react';

import './index.scss';

const Error = ({message}) => {
    return (
        <div className="error-message">
            <h1>Could not load scene:</h1>
            <h2>{message}</h2>
        </div>
    )
};

export default Error;
