import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor="#8E8E93"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F2F2F7',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  error: {
    fontSize: 12,
    color: '#FF3B30',
  },
});
