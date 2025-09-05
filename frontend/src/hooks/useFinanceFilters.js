import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * useFinanceFilters – централизует работу с фильтрами (year, shop) и URL.
 * Возвращает текущие значения и методы для их обновления.
 */
export const useFinanceFilters = (defaultYear = new Date().getFullYear().toString(), defaultShop = 'all') => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || defaultYear);
  const [selectedShop, setSelectedShop] = useState(searchParams.get('shop') || defaultShop);

  // ---- helpers ----
  const updateUrlParams = useCallback((key, value) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value === undefined || value === null || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // ---- setters that sync URL ----
  const changeYear = useCallback((year) => {
    setSelectedYear(year);
    updateUrlParams('year', year);
  }, [updateUrlParams]);

  const changeShop = useCallback((shopId) => {
    setSelectedShop(shopId);
    updateUrlParams('shop', shopId === 'all' ? null : shopId);
  }, [updateUrlParams]);

  // ---- sync from URL to state ----
  useEffect(() => {
    const urlYear = searchParams.get('year');
    const urlShop = searchParams.get('shop') || defaultShop;

    if (urlYear && urlYear !== selectedYear) {
      setSelectedYear(urlYear);
    }
    if (urlShop !== selectedShop) {
      setSelectedShop(urlShop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  return {
    selectedYear,
    selectedShop,
    changeYear,
    changeShop,
    searchParams,
    setSearchParams // иногда нужно напрямую
  };
}; 