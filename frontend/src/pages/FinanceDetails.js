import React from 'react';

import FinanceDetailsContainer from '../components/finance/FinanceDetailsContainer';

/**
 * Страница финансовых деталей
 * Использует Container/Presentational паттерн для соблюдения SRP
 */
const FinanceDetails = () => {
    return <FinanceDetailsContainer />;
};

export default FinanceDetails;