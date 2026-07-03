// app/coach.tsx — AI Coach chatscherm
// Basis chat-UI: berichtenlijst + inputveld. De antwoorden komen (nog) niet van
// een externe AI, maar van een rule-based generator (src/services/chatResponder.ts)
// die het AI profile object van de gebruiker gebruikt. De knop "Talk to Coach"
// op het home-scherm (app/(tabs)/index.tsx) navigeert hierheen.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useLang, useSettings } from '@/components/store';
import { Icon } from '@/components/Icon';
import { generateChatReply } from '@/src/services/chatResponder';

interface Message {
  id: string;
  role: 'user' | 'coach';
  text: string;
}

export default function Coach() {
  const { c } = useTheme();
  const { t, lang } = useLang();
  const { profileContext } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'coach', text: t('coach_greeting') },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: `${Date.now()}-user`, role: 'user', text };
    const replyMsg: Message = {
      id: `${Date.now()}-coach`,
      role: 'coach',
      text: generateChatReply(text, profileContext, lang),
    };
    setMessages((prev) => [...prev, userMsg, replyMsg]);
    setInput('');
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
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '82%',
            backgroundColor: item.role === 'user' ? c.accent : c.card,
            borderWidth: item.role === 'user' ? 0 : 1,
            borderColor: c.line,
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
          }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: item.role === 'user' ? c.onAccent : c.text }}>
              {item.text}
            </Text>
          </View>
        )}
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
          disabled={!input.trim()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : 0.5 }}
        >
          <Icon name="up" size={20} color={c.onAccent} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
