import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom Hook for Game State Management
const useGameState = () => {
    const [gameState, setGameState] = useState({ level: 1, score: 0 });

    useEffect(() => {
        // Load state from AsyncStorage on mount
        const loadState = async () => {
            const savedState = await AsyncStorage.getItem('gameState');
            if (savedState) {
                setGameState(JSON.parse(savedState));
            }
        };
        loadState();
    }, []);

    useEffect(() => {
        // Save state to AsyncStorage whenever it changes
        const saveState = async () => {
            await AsyncStorage.setItem('gameState', JSON.stringify(gameState));
        };
        saveState();
    }, [gameState]);

    return [gameState, setGameState];
};

// Game Engine Component
const GameEngine = () => {
    const [gameState, setGameState] = useGameState();

    const handleLevelUp = () => {
        setGameState(prevState => ({ ...prevState, level: prevState.level + 1 }));
    };

    const handleScoreIncrease = (points) => {
        setGameState(prevState => ({ ...prevState, score: prevState.score + points }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Game Level: {gameState.level}</Text>
            <Text style={styles.score}>Score: {gameState.score}</Text>
            <Button title="Level Up" onPress={handleLevelUp} />
            <Button title="Increase Score" onPress={() => handleScoreIncrease(10)} />
        </View>
    );
};

const App = () => {
    return (
        <View style={styles.appContainer}>
            <Text style={styles.title}>My Game Engine</Text>
            <GameEngine />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    score: {
        fontSize: 18,
    },
    appContainer: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
});

export default App;