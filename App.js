import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const App = () => {
  const [data, setData] = useState([]);
  const [signalText, setSignalText] = useState('');

  const analiziraj = () => {
    if (data.length === 0) {
      console.warn('No data available for analysis.');
      return;
    }
    // Processing data...
  };

  const buyButtonHandler = (index) => {
    // Safe bounds checking
    if (index < 0 || index >= data.length) {
      console.warn('Index out of bounds for buy action.');
      return;
    }
    const newData = [...data];
    newData[index].purchased = true;
    setData(newData);
    
    // Improved visibility handling
    setSignalText('Purchase successful!');
  };

  return (
    <View style={styles.container}>
      {data.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text>{item.name}</Text>
          <Button title="Buy" onPress={() => buyButtonHandler(index)} />
        </View>
      ))}
      <Text style={styles.signalText}>{signalText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    margin: 10,
  },
  signalText: {
    color: 'green',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default App;
