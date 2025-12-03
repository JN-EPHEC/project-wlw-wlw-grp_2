import { StyleSheet } from 'react-native';


const styles = StyleSheet.create({
  bottomNav: {
    height: 75,
    backgroundColor: '#F8F8F6',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navItemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -10,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FD9A34',
    shadowColor: '#FD9A34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  navText: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 4,
    fontWeight: '500',
  },
});