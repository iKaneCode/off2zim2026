import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Image,
  RefreshControl,
  Modal,
  Dimensions,
  Linking,
  ImageBackground,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader, WallpaperPattern } from '@/components';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import {
  responsiveFontSize,
  responsiveSize,
  Fonts,
  FontSizes,
  LineHeights,
} from '@/constants/Fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAvatarColor } from '@/utils/messageUtils';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  isOutgoing: boolean; // true for user messages, false for received messages
  attachment?: {
    type: 'image' | 'document';
    uri: string;
    name?: string;
    size?: number;
  };
}

export default function MessageDetailScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const { showAlert } = useAppAlert();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Parse the initial message data from params with error handling
  let initialMessage = null;
  try {
    initialMessage = params.message ? JSON.parse(params.message as string) : null;
  } catch (error) {
    console.error('Error parsing message data:', error);
    initialMessage = null;
  }

  // Initialize inputText with prefilled message if provided
  const [inputText, setInputText] = useState(initialMessage?.prefilledMessage || '');

  // Initialize chat with the original message (only if it's an existing conversation)
  React.useEffect(() => {
    if (initialMessage && messages.length === 0 && !initialMessage.isNewConversation) {
      // Only load existing message if this is not a new conversation
      if (initialMessage.message && initialMessage.message.trim() !== '') {
        const chatMessage: ChatMessage = {
          id: initialMessage.id,
          text: initialMessage.message,
          timestamp: initialMessage.time,
          isOutgoing: false, // Message from the other person
        };
        // Add a full timestamp for date comparison - use a date from a few days ago for testing
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2); // 2 days ago
        (chatMessage as any).fullTimestamp = pastDate.toISOString();
        setMessages([chatMessage]);
      }
    }
    // If isNewConversation is true, start with empty messages array
  }, [initialMessage, messages.length]);

  const handleGoBack = () => {
    // Update the message in the messages list when going back
    if (initialMessage && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const updatedMessageData = {
        id: initialMessage.id,
        name: initialMessage.name,
        message: lastMessage.text,
        time: lastMessage.timestamp,
        isRead: true,
        avatar: initialMessage.avatar,
        status: lastMessage.isOutgoing ? 'sent' : 'received',
        unreadCount: 0,
      };

      // Set params for messages tab to pick up
      router.setParams({ returnMessage: JSON.stringify(updatedMessageData) });
    }

    // Always use router.back() to properly dismiss
    router.back();
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a network request to check for updates
    setTimeout(() => {
      // In a real app, this would fetch from server
      // For now, just refresh the existing data without adding anything
      setRefreshing(false);
      // Add haptic feedback after refresh completes
      if (Platform.OS === 'ios') {
      }
    }, 1500); // Slightly longer delay for more natural feel
  };

  const formatMessageDate = (timestamp: string): string => {
    const messageDate = new Date(timestamp);
    return (
      messageDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) +
      ' ' +
      messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const openImage = (uri: string) => {
    setSelectedImageUri(uri);
    setImageModalVisible(true);
  };

  const openDocument = async (uri: string, name?: string) => {
    try {
      // First try to open directly with the system's default app
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
        return;
      }

      // If direct opening fails, try sharing for viewing
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: name?.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'application/octet-stream',
          dialogTitle: `Open ${name || 'Document'}`,
        });
      } else {
        // Fallback to showing document info
        showAlert({
          title: name || 'Document',
          message:
            'Document viewing is not available on this device. Here are the document details:',
          buttons: [
            { text: 'OK', style: 'default' },
            {
              text: 'Copy Path',
              onPress: () => {
                showAlert({ title: 'Document Path', message: uri, buttons: [{ text: 'OK' }] });
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error opening document:', error);
      showAlert({
        title: 'Cannot Open Document',
        message: `Unable to open ${name || 'this document'}. Try sharing it to another app.`,
        buttons: [
          {
            text: 'Try Sharing',
            onPress: async () => {
              try {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  await Sharing.shareAsync(uri);
                }
              } catch {
                showAlert({
                  title: 'Sharing Failed',
                  message: 'Could not share this document.',
                  buttons: [{ text: 'OK' }],
                });
              }
            },
          },
          { text: 'OK', style: 'default' },
        ],
      });
    }
  };

  const sendMessage = () => {
    if (inputText.trim().length === 0) return;

    const now = new Date();
    const timestamp = now.toISOString(); // Use ISO string for better date comparison
    const displayTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      timestamp: displayTime,
      isOutgoing: true,
    };

    // Add date timestamp for comparison
    (newMessage as any).fullTimestamp = timestamp;

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Scroll to bottom after sending
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const showAttachmentOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Photo Library', 'Document'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          switch (buttonIndex) {
            case 1:
              pickImageFromCamera();
              break;
            case 2:
              pickImageFromLibrary();
              break;
            case 3:
              pickDocument();
              break;
          }
        }
      );
    } else {
      showAlert({
        title: 'Select Attachment',
        message: 'Choose an option',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Camera', onPress: pickImageFromCamera },
          { text: 'Photo Library', onPress: pickImageFromLibrary },
          { text: 'Document', onPress: pickDocument },
        ],
      });
    }
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Permission needed',
        message: 'Camera permission is required to take photos.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      sendAttachment('image', result.assets[0].uri);
    }
  };

  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Permission needed',
        message: 'Photo library permission is required to select photos.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      sendAttachment('image', result.assets[0].uri);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        sendAttachment('document', asset.uri, asset.name, asset.size);
      }
    } catch {
      showAlert({ title: 'Error', message: 'Failed to pick document', buttons: [{ text: 'OK' }] });
    }
  };

  const sendAttachment = (
    type: 'image' | 'document',
    uri: string,
    name?: string,
    size?: number
  ) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const displayTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: type === 'image' ? 'Photo' : name || 'Document',
      timestamp: displayTime,
      isOutgoing: true,
      attachment: {
        type,
        uri,
        name,
        size,
      },
    };

    // Add date timestamp for comparison
    (newMessage as any).fullTimestamp = timestamp;

    setMessages(prev => [...prev, newMessage]);

    // Scroll to bottom after sending
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  if (!initialMessage) {
    return (
      <IOSScreenWrapper>
        <ThemedView style={styles.container}>
          <CustomHeader
            showLogo={true}
            leftAction={{
              icon: 'chevron-back',
              onPress: handleGoBack,
              color: '#FF3B30',
            }}
          />
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Message not found</ThemedText>
          </View>
        </ThemedView>
      </IOSScreenWrapper>
    );
  }

  const avatarColor = getAvatarColor(initialMessage?.avatar || 'default');

  const renderMessage = (message: ChatMessage, index: number) => {
    return (
      <View key={message.id}>
        {/* Message */}
        <View
          style={[
            styles.messageContainer,
            message.isOutgoing ? styles.outgoingMessage : styles.incomingMessage,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              message.isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
              {
                backgroundColor: message.isOutgoing
                  ? '#007AFF'
                  : colorScheme === 'dark'
                    ? '#1C1C1E'
                    : '#E9E9EB',
              },
            ]}
          >
            {message.attachment && message.attachment.type === 'image' && (
              <TouchableOpacity onPress={() => openImage(message.attachment!.uri)}>
                <Image
                  source={{ uri: message.attachment.uri }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {message.attachment && message.attachment.type === 'document' && (
              <TouchableOpacity
                onPress={() => openDocument(message.attachment!.uri, message.attachment!.name)}
                style={styles.documentAttachment}
              >
                <Ionicons
                  name="document-outline"
                  size={24}
                  color={message.isOutgoing ? '#FFFFFF' : '#007AFF'}
                />
                <View style={styles.documentInfo}>
                  <ThemedText
                    style={[
                      styles.documentName,
                      {
                        color: message.isOutgoing
                          ? '#FFFFFF'
                          : colorScheme === 'dark'
                            ? '#FFFFFF'
                            : '#000000',
                      },
                    ]}
                  >
                    {message.attachment.name || 'Document'}
                  </ThemedText>
                  {message.attachment.size && (
                    <ThemedText
                      style={[
                        styles.documentSize,
                        { color: message.isOutgoing ? 'rgba(255,255,255,0.7)' : '#8E8E93' },
                      ]}
                    >
                      {formatFileSize(message.attachment.size)}
                    </ThemedText>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={message.isOutgoing ? 'rgba(255,255,255,0.7)' : '#8E8E93'}
                />
              </TouchableOpacity>
            )}

            {(!message.attachment || message.text !== 'Photo') && (
              <ThemedText
                style={[
                  styles.messageText,
                  message.isOutgoing ? styles.outgoingMessageText : styles.incomingMessageText,
                  {
                    color: message.isOutgoing
                      ? '#FFFFFF'
                      : colorScheme === 'dark'
                        ? '#FFFFFF'
                        : '#000000',
                  },
                ]}
              >
                {message.text}
              </ThemedText>
            )}
          </View>

          {/* Timestamp outside bubble */}
          <ThemedText
            style={[
              styles.timestampText,
              message.isOutgoing ? styles.outgoingTimestamp : styles.incomingTimestamp,
              { color: '#8E8E93' },
            ]}
          >
            {formatMessageDate((message as any).fullTimestamp || new Date().toISOString())}
          </ThemedText>
        </View>
      </View>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'card',
          animation: Platform.OS === 'android' ? 'ios_from_right' : 'slide_from_right',
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: Platform.OS === 'ios',
          contentStyle: { backgroundColor: colorScheme === 'dark' ? '#000000' : '#f2f2f7' },
        }}
      />
      <IOSScreenWrapper>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
            {/* Custom Header */}
            <CustomHeader
              showLogo={true}
              leftAction={{
                icon: 'chevron-back',
                onPress: handleGoBack,
                color: '#FF3B30',
              }}
            />

            {/* Chat Contact Header */}
            <View style={styles.chatContactHeader}>
              <View
                style={[
                  styles.avatarContainer,
                  {
                    backgroundColor: initialMessage.avatarImage
                      ? 'transparent'
                      : initialMessage.avatarBgColor || avatarColor,
                    borderColor: initialMessage.avatarImage
                      ? 'transparent'
                      : initialMessage.avatarBorderColor || avatarColor,
                    borderWidth: initialMessage.avatarImage
                      ? 0
                      : initialMessage.avatarBorderColor
                        ? 2
                        : 0,
                  },
                ]}
              >
                {initialMessage.avatarImage ? (
                  <Image
                    source={{ uri: initialMessage.avatarImage }}
                    style={styles.avatarImage}
                    resizeMode="contain"
                  />
                ) : (
                  <ThemedText style={styles.avatarText}>
                    {initialMessage.avatar || initialMessage.name?.charAt(0)?.toUpperCase() || '?'}
                  </ThemedText>
                )}
              </View>

              <View style={styles.contactInfo}>
                <ThemedText type="sectionTitle" style={styles.contactName}>
                  {initialMessage.name || 'Unknown Contact'}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[
                  styles.callButton,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.callIconBubble,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                    },
                  ]}
                >
                  <Ionicons name="call" size={12} color="#34C759" />
                </View>
                <ThemedText style={styles.callLabel} lightColor="#1C1C1E" darkColor="#FFFFFF">
                  Call
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <View style={styles.messagesContainer}>
              {/* Pattern Background - covers entire message area */}
              <View style={StyleSheet.absoluteFillObject}>
                <WallpaperPattern offsetTop={0} unlimited={true} />
              </View>

              {/* Scrollable Content */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollViewContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.messagesContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              >
                <View style={styles.messagesWrapper}>
                  {messages.map((message, index) => renderMessage(message, index))}
                </View>
              </ScrollView>
            </View>

            {/* Input Area */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#000000' : '#F2F2F7',
                  borderTopColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                },
              ]}
            >
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <TouchableOpacity
                  onPress={showAttachmentOptions}
                  style={[
                    styles.attachmentButton,
                    { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' },
                  ]}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                    },
                  ]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder=""
                  placeholderTextColor="#8E8E93"
                  multiline
                  maxLength={1000}
                  textAlignVertical="center"
                />

                {inputText.trim().length > 0 ? (
                  <TouchableOpacity
                    onPress={sendMessage}
                    style={[styles.sendButton, { backgroundColor: '#007AFF' }]}
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={pickImageFromCamera}
                    style={[
                      styles.mediaButton,
                      { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' },
                    ]}
                  >
                    <Ionicons name="camera" size={18} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>

        {/* Image Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.imageModalContainer}>
            <TouchableOpacity
              style={styles.imageModalOverlay}
              onPress={() => setImageModalVisible(false)}
            >
              <View style={styles.imageModalContent}>
                <TouchableOpacity
                  style={styles.imageModalCloseButton}
                  onPress={() => setImageModalVisible(false)}
                >
                  <View
                    style={[
                      styles.imageModalCloseIconCircle,
                      {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(255, 59, 48, 0.15)'
                            : 'rgba(255, 59, 48, 0.1)',
                      },
                    ]}
                  >
                    <Ionicons name="close" size={24} color="#FF3B30" />
                  </View>
                </TouchableOpacity>

                {selectedImageUri && (
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Modal>
      </IOSScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: responsiveFontSize(16),
    color: '#8E8E93',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  contactName: {
    marginBottom: 2,
  },
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContent: {
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 4,
  },
  outgoingMessage: {
    alignItems: 'flex-end',
  },
  incomingMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  outgoingBubble: {
    borderBottomRightRadius: 4,
  },
  incomingBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FontSizes.lg,
    lineHeight: LineHeights.lg,
    marginBottom: 4,
  },
  incomingMessageText: {
    fontFamily: Fonts.regular,
  },
  outgoingMessageText: {
    fontFamily: Fonts.medium,
  },
  timestampText: {
    fontSize: responsiveFontSize(12),
    marginTop: 4,
    marginHorizontal: 16,
  },
  outgoingTimestamp: {
    textAlign: 'right',
  },
  incomingTimestamp: {
    textAlign: 'left',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  textInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    maxHeight: 100,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    lineHeight: 20,
    borderRadius: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  attachmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  documentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
    marginBottom: 2,
  },
  documentSize: {
    fontSize: responsiveFontSize(12),
  },
  chatContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSize(12, 10, 14),
    paddingVertical: responsiveSize(7, 5, 9),
    borderRadius: 999,
    marginRight: 4,
  },
  callIconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    elevation: 0,
  },
  callLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  videoCallButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalCloseIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  chatBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  chatBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Background color will be set dynamically based on color scheme
  },
  scrollViewContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesWrapper: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
