import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../theme';
import { CTA_BUTTON_HEIGHT } from '../lib/platform-ui';
import { GradientButton } from './ui/GradientButton';
import { GlassCard } from './ui/GlassCard';
import { GlassSurface } from './ui/GlassSurface';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MIN_YEAR = 1940;
const MAX_YEAR = new Date().getFullYear();

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DECADES = Array.from(
  { length: Math.floor(MAX_YEAR / 10) - Math.floor(MIN_YEAR / 10) + 1 },
  (_, i) => Math.floor(MIN_YEAR / 10) * 10 + i * 10,
);

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_RE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y
    || date.getMonth() !== m - 1
    || date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatFriendlyDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function yearsInDecade(decade: number): number[] {
  return Array.from({ length: 10 }, (_, i) => decade + i).filter(
    (y) => y >= MIN_YEAR && y <= MAX_YEAR,
  );
}

function StepHeader({ step }: { step: number }) {
  const labels = ['Select year', 'Select month', 'Select day'];
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.stepCount}>Step {step + 1} of 3</Text>
      <Text style={styles.stepTitle}>{labels[step]}</Text>
    </View>
  );
}

function YearStep({
  year,
  onSelect,
}: {
  year: number;
  onSelect: (year: number) => void;
}) {
  const [decade, setDecade] = useState(() => Math.floor(year / 10) * 10);
  const years = useMemo(() => yearsInDecade(decade), [decade]);

  useEffect(() => {
    setDecade(Math.floor(year / 10) * 10);
  }, [year]);

  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepHint}>Choose the decade, then tap your birth year</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {DECADES.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, decade === d && styles.chipActive]}
            onPress={() => setDecade(d)}
          >
            <Text style={[styles.chipText, decade === d && styles.chipTextActive]}>{d}s</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.grid}>
        {years.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.gridBtn, year === y && styles.gridBtnActive]}
            onPress={() => onSelect(y)}
          >
            <Text style={[styles.gridBtnText, year === y && styles.gridBtnTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function MonthStep({
  month,
  onSelect,
}: {
  month: number;
  onSelect: (month: number) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepHint}>Tap the month you were born</Text>
      <View style={styles.list}>
        {MONTHS.map((name, index) => (
          <TouchableOpacity
            key={name}
            style={[styles.listRow, month === index && styles.listRowActive]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.listRowText, month === index && styles.listRowTextActive]}>
              {name}
            </Text>
            {month === index && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DayStep({
  year,
  month,
  day,
  onSelect,
}: {
  year: number;
  month: number;
  day: number;
  onSelect: (day: number) => void;
}) {
  const count = daysInMonth(year, month);

  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepHint}>
        Tap your birth day in {MONTHS[month]} {year}
      </Text>
      <View style={styles.dayGrid}>
        {Array.from({ length: count }, (_, i) => i + 1).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayBtn, day === d && styles.dayBtnActive]}
            onPress={() => onSelect(d)}
          >
            <Text style={[styles.dayBtnText, day === d && styles.dayBtnTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function BirthDatePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const [step, setStep] = useState(0);
  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day, setDay] = useState(value.getDate());

  useEffect(() => {
    setYear(value.getFullYear());
    setMonth(value.getMonth());
    setDay(value.getDate());
  }, [value]);

  const pushDate = (y: number, m: number, d: number) => {
    const maxDay = daysInMonth(y, m);
    const safeDay = Math.min(d, maxDay);
    setYear(y);
    setMonth(m);
    setDay(safeDay);
    onChange(new Date(y, m, safeDay));
  };

  const pickYear = (y: number) => {
    pushDate(y, month, day);
    setStep(1);
  };

  const pickMonth = (m: number) => {
    pushDate(year, m, day);
    setStep(2);
  };

  const pickDay = (d: number) => {
    pushDate(year, month, d);
  };

  return (
    <GlassCard borderRadius={18} padding={0} style={styles.pickerCard} contentStyle={styles.pickerCardContent}>
      <StepHeader step={step} />

      <ScrollView style={styles.stepScroll} showsVerticalScrollIndicator={false}>
        {step === 0 && <YearStep year={year} onSelect={pickYear} />}
        {step === 1 && <MonthStep month={month} onSelect={pickMonth} />}
        {step === 2 && <DayStep year={year} month={month} day={day} onSelect={pickDay} />}
      </ScrollView>

      {step > 0 && (
        <TouchableOpacity style={styles.backLink} onPress={() => setStep((s) => s - 1)}>
          <Ionicons name="chevron-back" size={16} color={Colors.muted} />
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

type DateOfBirthFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function DateOfBirthField({
  value,
  onChange,
  placeholder = 'Select date of birth',
}: DateOfBirthFieldProps) {
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseIsoDate(value) ?? new Date(1990, 0, 1));
  const [pickerKey, setPickerKey] = useState(0);

  const displayValue = useMemo(() => {
    const parsed = parseIsoDate(value);
    if (!parsed) return '';
    return formatFriendlyDate(parsed);
  }, [value]);

  const openPicker = () => {
    setDraft(parseIsoDate(value) ?? new Date(1990, 0, 1));
    setPickerKey((k) => k + 1);
    setShowPicker(true);
  };

  const confirmDate = () => {
    onChange(formatIsoDate(draft));
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker} activeOpacity={0.75}>
        <Text style={[styles.triggerText, !displayValue && styles.triggerPlaceholder]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.primary} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdropPress} onPress={() => setShowPicker(false)}>
            <BlurView
              intensity={36}
              tint="dark"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            />
            <View style={styles.backdropTint} pointerEvents="none" />
          </Pressable>

          <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 12 }]}>
            <GlassSurface
              variant="light"
              borderRadius={Radius.xl}
              intensity={64}
              style={styles.sheet}
              contentStyle={styles.sheetInner}
            >
              <LinearGradient
                colors={[Colors.heroDark, '#2E1065']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sheetHeader}
              >
                <Text style={styles.sheetTitle}>Date of birth</Text>
                <Text style={styles.sheetSub}>Must match your BVN records</Text>
                <View style={styles.previewPill}>
                  <Ionicons name="calendar" size={14} color={Colors.primaryLight} />
                  <Text style={styles.previewText}>{formatFriendlyDate(draft)}</Text>
                </View>
              </LinearGradient>

              {showPicker && (
                <BirthDatePicker key={pickerKey} value={draft} onChange={setDraft} />
              )}

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton
                  title="Confirm date"
                  onPress={confirmDate}
                  size="compact"
                  style={styles.confirmWrap}
                />
              </View>
            </GlassSurface>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark,
  },
  triggerPlaceholder: {
    color: Colors.mutedLight,
    fontWeight: '400',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  sheetWrap: {
    maxHeight: '90%',
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  sheetInner: {
    padding: 0,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  sheetSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  pickerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pickerCardContent: {
    padding: 0,
  },
  stepHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  stepCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  stepScroll: {
    maxHeight: 320,
  },
  stepBody: {
    padding: 16,
    gap: 12,
  },
  stepHint: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.mutedLight,
    lineHeight: 19,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    backgroundColor: '#EDE9FE',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 4,
  },
  gridBtn: {
    width: '30%',
    minWidth: 68,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  gridBtnActive: {
    backgroundColor: '#EDE9FE',
  },
  gridBtnText: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.mid,
  },
  gridBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  list: {
    gap: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  listRowActive: {
    backgroundColor: '#F5F3FF',
  },
  listRowText: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.mid,
  },
  listRowTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 4,
  },
  dayBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  dayBtnActive: {
    backgroundColor: '#EDE9FE',
  },
  dayBtnText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.mid,
  },
  dayBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    flexBasis: 0,
    minHeight: CTA_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.muted,
  },
  confirmWrap: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
});
