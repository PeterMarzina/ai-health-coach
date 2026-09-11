// app/coach.tsx — AI Coach chatscherm
// Berichtenlijst + inputveld. Antwoorden komen van de coach-chat Edge Function
// (src/services/coachChat.ts): die leest de volledige context van de gebruiker
// (workouts, voeding, slaap, gewicht, eerdere gesprekken) en kan zelf acties uitvoeren,
// zoals het workout-plan of de voedingsdoelen aanpassen. Bij het verlaten van het
// scherm wordt het gesprek samengevat als geheugen voor een volgend gesprek.
// De knop "Talk to Coach" op het home-scherm (app/(tabs)/index.tsx) navigeert hierheen.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useLang, useSettings } from '@/components/store';
import { Icon } from '@/components/Icon';
import { sendCoachMessage, summarizeCoachConversation, CoachAction, CoachChatMessage } from '@/src/services/coachChat';
import type { TKey } from '@/constants/i18n';

interface Message {
  id: string;
  role: 'user' | 'coach';
  text: string;
  actions?: CoachAction[];
  failed?: boolean;       // foutmelding i.p.v. een echt coach-antwoord
}

const ACTION_LABEL: Partial<Record<CoachAction['tool'], TKey>> = {
  update_workout_plan: 'coach_action_plan',
  add_lifestyle_recommendation: 'coach_action_lifestyle',
  adjust_nutrition_targets: 'coach_action_nutrition',
};

// Alleen echte gespreksbeurten gaan naar de coach: niet de lokale begroeting en
// niet de foutmeldingen.
function toHistory(messages: Message[]): CoachChatMessage[] {
  return messages
    .filter((m) => m.id !== 'greeting' && !m.failed)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
}

export default function Coach() {
  const { c } = useTheme();
  const { t, lang } = useLang();
  const { refreshSettings } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'coach', text: t('coach_greeting') },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Laatste gesprek + taal bijhouden voor de samenvatting bij het verlaten van het scherm.
  const latest = useRef({ messages, lang });
  useEffect(() => {
    latest.current = { messages, lang };
  }, [messages, lang]);
  useEffect(() => () => {
    summarizeCoachConversation(toHistory(latest.current.messages), latest.current.lang);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: `${Date.now()}-user`, role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      const reply = await sendCoachMessage(toHistory(next), lang, t('coach_error'));
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-coach`,
        role: 'coach',
        text: reply.content || t('coach_error'),
        actions: reply.actions.filter((a) => a.ok && ACTION_LABEL[a.tool]),
        failed: !reply.content,
      }]);
      // Doelen gewijzigd door de coach → lokale instellingen opnieuw laden.
      if (reply.actions.some((a) => a.ok && a.tool === 'adjust_nutrition_targets')) refreshSettings();
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: `${Date.now()}-error`, role: 'coach', text: e?.message ?? t('coach_error'), failed: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 14 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevL" size={19} color={c.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Icon name="sparkle" size={17} color={c.accentText} fill={c.accentText} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>{t('coach_title')}</Text>
        </View>
      </View>

      {/* messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%', gap: 6 }}>
            <View style={{
              backgroundColor: item.role === 'user' ? c.accent : c.card,
              borderWidth: item.role === 'user' ? 0 : 1,
              borderColor: item.failed ? c.bad : c.line,
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: item.role === 'user' ? c.onAccent : item.failed ? c.bad : c.text }}>
                {item.text}
              </Text>
            </View>
            {item.actions?.map((a, i) => (
              <View key={`${a.tool}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accentSoft, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Icon name="sparkle" size={12} color={c.accentText} fill={c.accentText} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: c.accentText, flexShrink: 1 }}>{t(ACTION_LABEL[a.tool]!)}</Text>
              </View>
            ))}
          </View>
        )}
        ListFooterComponent={sending ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <ActivityIndicator size="small" color={c.accentText} />
            <Text style={{ fontSize: 13, color: c.sub }}>{t('coach_typing')}</Text>
          </View>
        ) : null}
      />

      {/* input */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('coach_input_ph')}
          placeholderTextColor={c.dim}
          style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14.5, color: c.text }}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={send}
          disabled={!input.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: input.trim() && !sending ? 1 : 0.5 }}
        >
          <Icon name="up" size={20} color={c.onAccent} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
