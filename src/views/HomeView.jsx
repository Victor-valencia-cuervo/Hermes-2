import HomeWidgets from '../widgets/HomeWidgets';

// El inicio ahora es una rejilla de widgets (ver /src/widgets): se agregan, quitan y ordenan desde Personalizar o Ajustes.
export default function HomeView({ now, greeting, quote, weather, react, reminders, onPoke, onOpenWeather, playing, idle }) {
  return (
    <HomeWidgets {...{ now, greeting, quote, weather, react, reminders, onPoke, onOpenWeather, playing, idle, hour: now.getHours() }} />
  );
}
