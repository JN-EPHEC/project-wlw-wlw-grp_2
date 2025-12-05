import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function UserProfilePage() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Profil utilisateur</Text>
			<Text>Ceci est la page profil (placeholder).</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
	},
});
