export function getNoteColor(note: string): string {
  const noteColors: { [key: string]: string } = {
    do: "bg-purple-700",
    re: "bg-orange-700",
    mi: "bg-green-700",
    fa: "bg-blue-700",
    sol: "bg-yellow-700",
    la: "bg-red-700",
    si: "bg-pink-700",
  };
  return noteColors[note] || "bg-gray-500"; // Default color if note not found
}