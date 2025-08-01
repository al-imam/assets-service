export function calculateTTL({
  months = 0,
  weeks = 0,
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
}) {
  const millisecondsPerSecond = 1000;
  const secondsPerMinute = 60;
  const minutesPerHour = 60;
  const hoursPerDay = 24;
  const daysPerWeek = 7;
  const daysPerMonth = 30;

  const monthMilliseconds =
    months * daysPerMonth * hoursPerDay * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
  const weekMilliseconds =
    weeks * daysPerWeek * hoursPerDay * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
  const dayMilliseconds = days * hoursPerDay * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
  const hourMilliseconds = hours * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
  const minuteMilliseconds = minutes * secondsPerMinute * millisecondsPerSecond;
  const secondMilliseconds = seconds * millisecondsPerSecond;

  return (
    monthMilliseconds +
    weekMilliseconds +
    dayMilliseconds +
    hourMilliseconds +
    minuteMilliseconds +
    secondMilliseconds +
    milliseconds
  );
}
