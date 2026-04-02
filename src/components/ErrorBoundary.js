import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BOJE, FONT_FAMILY } from '../config/constants';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[ErrorBoundary] UI crash:', error?.message);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Nešto je pošlo po zlu</Text>
          <Text style={styles.subtitle}>Dodirni za ponovno učitavanje ekrana.</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnTxt}>Pokušaj ponovo</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: BOJE.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: BOJE.textMain, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  subtitle: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, textAlign: 'center', marginBottom: 14 },
  btn: { backgroundColor: BOJE.energija, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnTxt: { color: '#000', fontFamily: FONT_FAMILY, fontWeight: '900' },
});

export default ErrorBoundary;
