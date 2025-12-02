import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  const tenths = Math.floor((totalSeconds % 1) * 10)
    .toString()
    .padStart(1, '0');
  return `${minutes}:${seconds}.${tenths}`;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function StopwatchScreen() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [workDuration, setWorkDuration] = useState(30);
  const [restDuration, setRestDuration] = useState(15);
  const [rounds, setRounds] = useState(5);
  const [intervalRunning, setIntervalRunning] = useState(false);
  const [phase, setPhase] = useState<'work' | 'rest'>('work');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(workDuration);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dingSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDing = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/boxing-ding.wav'),
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        dingSoundRef.current = sound;
      } catch (error) {
        console.warn('Failed to load boxing ding sound', error);
      }
    };

    loadDing();

    return () => {
      isMounted = false;
      if (dingSoundRef.current) {
        dingSoundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 0.1);
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (!intervalRunning) return;

    intervalTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [intervalRunning]);

  useEffect(() => {
    if (intervalRunning) return;
    setTimeLeft(phase === 'work' ? workDuration : restDuration);
  }, [phase, workDuration, restDuration, intervalRunning]);

  const playDing = useCallback(async () => {
    if (!dingSoundRef.current) return;

    try {
      await dingSoundRef.current.replayAsync();
    } catch (error) {
      console.warn('Failed to play boxing ding', error);
    }
  }, []);

  useEffect(() => {
    if (!intervalRunning) return;
    if (timeLeft > 0) return;

    playDing();

    if (phase === 'work') {
      setPhase('rest');
      setTimeLeft(restDuration);
    } else {
      if (currentRound === rounds) {
        setIntervalRunning(false);
        setTimeLeft(restDuration);
        setCurrentRound(1);
        setPhase('work');
      } else {
        setCurrentRound((prev) => prev + 1);
        setPhase('work');
        setTimeLeft(workDuration);
      }
    }
  }, [timeLeft, phase, restDuration, workDuration, rounds, intervalRunning, currentRound, playDing]);

  const phaseLabel = phase === 'work' ? 'Trabalho' : 'Descanso';
  const nextPhaseColor = phase === 'work' ? '#0e9aed' : '#74c1ff';

  const disableIntervalControls = intervalRunning;

  const progressPercent = useMemo(() => {
    const totalPhase = phase === 'work' ? workDuration : restDuration;
    return Math.max(0, Math.min(100, (timeLeft / totalPhase) * 100));
  }, [phase, restDuration, timeLeft, workDuration]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playDing = useCallback(async () => {
    if (!dingSoundRef.current) return;

    try {
      await dingSoundRef.current.replayAsync();
    } catch (error) {
      console.warn('Failed to play boxing ding', error);
    }
  }, []);

  const handleIntervalStart = () => {
    setIntervalRunning(true);
    setPhase('work');
    setCurrentRound(1);
    setTimeLeft(workDuration);
    playDing();
  };

  const handleIntervalPause = () => {
    setIntervalRunning(false);
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
  };

  const handleIntervalReset = () => {
    setIntervalRunning(false);
    setPhase('work');
    setCurrentRound(1);
    setTimeLeft(workDuration);
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <TopBar title="Cronômetro" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Cronômetro e intervalos
        </ThemedText>
        <ThemedText style={styles.muted}>
          Acompanhe aquecimentos, testes e blocos de intervalos com um visual direto e alinhado às
          cores da Dotto.
        </ThemedText>

        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>
            Cronômetro clássico
          </ThemedText>
          <ThemedText type="title" style={[styles.timerText, styles.cardPrimaryText]}>
            {formatTime(elapsed)}
          </ThemedText>
          <View style={styles.buttonRow}>
            {!isRunning ? (
              <Pressable style={[styles.button, styles.buttonSolid]} onPress={handleStart}>
                <ThemedText type="defaultSemiBold" style={styles.buttonSolidText}>
                  Iniciar
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable style={[styles.button, styles.buttonGhost]} onPress={handlePause}>
                <ThemedText type="defaultSemiBold" style={styles.buttonGhostText}>
                  Pausar
                </ThemedText>
              </Pressable>
            )}
            <Pressable style={[styles.button, styles.buttonGhost]} onPress={handleReset}>
              <ThemedText type="defaultSemiBold" style={styles.buttonGhostText}>
                Zerar
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Criador de intervalos</ThemedText>
          <ThemedText style={styles.muted}>
            Configure trabalho, descanso e quantas rodadas deseja. Toque em iniciar para alternar as
            fases automaticamente.
          </ThemedText>

          <View style={styles.row}>
            <IntervalControl
              label="Trabalho"
              value={workDuration}
              onChange={(next) => setWorkDuration(next)}
              disabled={disableIntervalControls}
            />
            <IntervalControl
              label="Descanso"
              value={restDuration}
              onChange={(next) => setRestDuration(next)}
              disabled={disableIntervalControls}
            />
            <IntervalControl
              label="Séries"
              value={rounds}
              min={1}
              max={20}
              step={1}
              onChange={(next) => setRounds(next)}
              disabled={disableIntervalControls}
              unit=""
            />
          </View>

          <ThemedView style={styles.intervalDisplay}>
            <ThemedText type="defaultSemiBold">Rodada {currentRound} de {rounds}</ThemedText>
            <ThemedText style={[styles.muted, { color: nextPhaseColor }]}>{phaseLabel}</ThemedText>
            <ThemedText type="title" style={styles.timerText}>
              {formatSeconds(timeLeft)}
            </ThemedText>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.buttonRow}>
              {!intervalRunning ? (
                <Pressable style={[styles.button, styles.buttonSolid]} onPress={handleIntervalStart}>
                  <ThemedText type="defaultSemiBold" style={styles.buttonSolidText}>
                    Iniciar série
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable style={[styles.button, styles.buttonGhost]} onPress={handleIntervalPause}>
                  <ThemedText type="defaultSemiBold" style={styles.buttonGhostText}>
                    Pausar
                  </ThemedText>
                </Pressable>
              )}
              <Pressable style={[styles.button, styles.buttonGhost]} onPress={handleIntervalReset}>
                <ThemedText type="defaultSemiBold" style={styles.buttonGhostText}>
                  Reiniciar
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

interface IntervalControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
}

function IntervalControl({
  label,
  value,
  onChange,
  min = 5,
  max = 120,
  step = 5,
  disabled,
  unit = 's',
}: IntervalControlProps) {
  const handleIncrease = () => onChange(adjust(value, step));
  const handleDecrease = () => onChange(adjust(value, -step));

  const adjust = (current: number, delta: number) => {
    const next = current + delta;
    if (next < min) return min;
    if (next > max) return max;
    return next;
  };

  return (
    <ThemedView style={[styles.controlCard, disabled && styles.controlDisabled]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <ThemedText style={styles.controlValue}>{unit ? `${value}${unit}` : value}</ThemedText>
      <View style={styles.controlButtons}>
        <Pressable
          disabled={disabled}
          style={[styles.adjustButton, disabled && styles.adjustButtonDisabled]}
          onPress={handleDecrease}>
          <ThemedText style={styles.adjustText}>-</ThemedText>
        </Pressable>
        <Pressable
          disabled={disabled}
          style={[styles.adjustButton, disabled && styles.adjustButtonDisabled]}
          onPress={handleIncrease}>
          <ThemedText style={styles.adjustText}>+</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  heading: {
    marginBottom: 4,
  },
  muted: {
    opacity: 0.82,
  },
  cardPrimary: {
    borderRadius: 16,
    padding: 18,
    gap: 12,
    backgroundColor: '#0e9aed',
  },
  cardPrimaryText: {
    color: '#e9f6ff',
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  timerText: {
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSolid: {
    backgroundColor: '#022a4c',
  },
  buttonSolidText: {
    color: '#fff',
  },
  buttonGhost: {
    backgroundColor: '#f4faff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(2,42,76,0.18)',
  },
  buttonGhostText: {
    color: '#022a4c',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  controlCard: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f4faff',
    gap: 8,
    alignItems: 'center',
  },
  controlValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#022a4c',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e9aed',
  },
  adjustButtonDisabled: {
    backgroundColor: '#b8dfff',
  },
  adjustText: {
    color: '#fff',
    fontSize: 18,
  },
  controlDisabled: {
    opacity: 0.7,
  },
  intervalDisplay: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f4faff',
    gap: 8,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#d8eefe',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0e9aed',
  },
});
