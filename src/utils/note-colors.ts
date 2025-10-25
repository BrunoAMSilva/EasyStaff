export function getNoteColor(note: string): string {
  const noteColors: { [key: string]: string } = {
    do: "bg-purple-500",
    re: "bg-orange-500",
    mi: "bg-green-500",
    fa: "bg-blue-500",
    sol: "bg-yellow-500",
    la: "bg-red-500",
    si: "bg-pink-500",
  };
  return noteColors[note] || "bg-gray-500"; // Default color if note not found
}