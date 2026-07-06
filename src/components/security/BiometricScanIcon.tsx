import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { BiometricGlyphKind } from '../../lib/biometric-ui';

type BiometricScanIconProps = {
  kind: BiometricGlyphKind;
  size: number;
  color: string;
};

const STROKE = 2.6;
const SCAN_STROKE = 3.2;

function CornerBrackets({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M8 17V8h9"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M31 8h9v9"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 31v9h9"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M40 31v9h-9"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function FaceScanGlyph({ color }: { color: string }) {
  return (
    <>
      <CornerBrackets color={color} />
      <Circle cx={24} cy={21} r={6.4} fill={color} />
      <Path
        d="M16.5 30.5c0-3.6 3.4-5.8 7.5-5.8s7.5 2.2 7.5 5.8"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Line
        x1={14}
        y1={21}
        x2={34}
        y2={21}
        stroke={color}
        strokeWidth={SCAN_STROKE}
        strokeLinecap="round"
      />
    </>
  );
}

function FingerprintGlyph({ color }: { color: string }) {
  return (
    <>
      <CornerBrackets color={color} />
      <Path
        d="M24 11.5c-3.8 0-6.5 2.8-6.5 6.4 0 4.2 2.2 6.1 4.2 8.2 1.4 1.5 2.3 2.6 2.3 4.6"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Path
        d="M24 8.8v3.2M19.2 13.2c-1.8 1.6-2.9 3.8-2.9 6.4M28.8 13.2c1.8 1.6 2.9 3.8 2.9 6.4"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Path
        d="M17.2 18.4c0 2.4 1.4 4.1 3 5.6 1.1 1.1 1.8 2 1.8 3.6M30.8 18.4c0 2.4-1.4 4.1-3 5.6-1.1 1.1-1.8 2-1.8 3.6"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Path
        d="M21 22.8c0 1.6 1.2 2.8 3 2.8s3-1.2 3-2.8"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </>
  );
}

export function BiometricScanIcon({ kind, size, color }: BiometricScanIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {kind === 'fingerprint' ? (
        <FingerprintGlyph color={color} />
      ) : (
        <FaceScanGlyph color={color} />
      )}
    </Svg>
  );
}
