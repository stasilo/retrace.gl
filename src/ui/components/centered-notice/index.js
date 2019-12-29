import React from 'react';

import './index.scss';

const CenteredNotice = ({message}) => {
    return (
        <div className="centered-notice">
            {message}
        </div>
    )
};

export default CenteredNotice;
