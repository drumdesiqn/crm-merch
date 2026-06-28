// This file prevents Tailwind v4 from purging dark mode classes used in dynamic strings.
// DO NOT DELETE.
export default function TailwindSafelist() {
  return (
    <div className="
      bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800
      bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800
      bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300
      bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300
    " />
  );
}
