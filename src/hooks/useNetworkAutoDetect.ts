import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AirtimeProvider } from '../lib/api';
import { detectNetworkFromPhone, getNumberPrefixesCached, peekNumberPrefixes } from '../lib/number-prefix-cache';
import {
  formatPhoneInput,
  isCompleteNigerianPhone,
  normalizeNigerianPhone,
} from '../lib/phone';

type UseNetworkAutoDetectOptions = {
  phone: string;
  setPhone: (value: string) => void;
  selectedNetwork: string;
  setSelectedNetwork: (code: string) => void;
  providers: AirtimeProvider[];
  autoSelect?: boolean;
};

export function useNetworkAutoDetect({
  phone,
  setPhone,
  selectedNetwork,
  setSelectedNetwork,
  providers,
  autoSelect = true,
}: UseNetworkAutoDetectOptions) {
  const [detectedNet, setDetectedNet] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [prefixReady, setPrefixReady] = useState(peekNumberPrefixes().length > 0);
  const detectSeq = useRef(0);

  useEffect(() => {
    if (prefixReady) return;
    void getNumberPrefixesCached().then((entries) => {
      if (entries.length > 0) setPrefixReady(true);
    });
  }, [prefixReady]);

  const onPhoneChange = useCallback((value: string) => {
    setPhone(formatPhoneInput(value));
  }, [setPhone]);

  const runDetection = useCallback(() => {
    if (!isCompleteNigerianPhone(phone)) {
      setDetectedNet('');
      setDetecting(false);
      return;
    }

    const detected = detectNetworkFromPhone(phone);
    if (!detected) {
      setDetectedNet('');
      setDetecting(false);
      return;
    }

    const isAllowed = providers.some(
      (provider) => String(provider.code || '').toLowerCase() === detected.networkCode,
    );

    if (!isAllowed) {
      setDetectedNet('');
      setDetecting(false);
      return;
    }

    setDetectedNet(detected.networkName);
    setDetecting(false);

    if (autoSelect && !selectedNetwork) {
      setSelectedNetwork(detected.networkCode);
    }
  }, [phone, providers, selectedNetwork, setSelectedNetwork, autoSelect]);

  useEffect(() => {
    const seq = ++detectSeq.current;

    if (!isCompleteNigerianPhone(phone)) {
      setDetectedNet('');
      setDetecting(false);
      return;
    }

    if (prefixReady) {
      runDetection();
      return;
    }

    setDetecting(true);
    const timer = setTimeout(() => {
      if (seq !== detectSeq.current) return;
      runDetection();
    }, 150);

    return () => clearTimeout(timer);
  }, [phone, providers, prefixReady, runDetection]);

  const normalizedPhone = normalizeNigerianPhone(phone);

  const networkResolvedByPrefix = useMemo(() => {
    if (!isCompleteNigerianPhone(phone) || !selectedNetwork) return false;
    const detected = detectNetworkFromPhone(phone);
    return detected?.networkCode === selectedNetwork.toLowerCase();
  }, [phone, selectedNetwork]);

  return {
    onPhoneChange,
    detectedNet,
    detecting,
    normalizedPhone,
    isPhoneComplete: isCompleteNigerianPhone(phone),
    networkResolvedByPrefix,
  };
}
