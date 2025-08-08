#!/bin/bash

# Script to remove unused dependencies from the project

echo "🧹 Cleaning up unused dependencies..."

# Remove definitely unused drag-and-drop libraries
npm uninstall @dnd-kit/core @dnd-kit/modifiers @dnd-kit/sortable @dnd-kit/utilities
npm uninstall react-dnd react-dnd-html5-backend

# Remove unused UI library
npm uninstall swiper

# Remove unused dev dependency
npm uninstall -D @types/react-transition-group

echo "✅ Removed definitely unused dependencies"

echo ""
echo "⚠️  The following dependencies might be unused but need verification:"
echo "   - apexcharts & react-apexcharts (consider using only recharts)"
echo "   - flatpickr (consider using only date-fns)"
echo "   - @react-jvectormap/core & @react-jvectormap/world (check if map is needed)"
echo "   - @fullcalendar/* packages (check if calendar feature is essential)"
echo ""
echo "To remove these after verification, run:"
echo "npm uninstall apexcharts react-apexcharts flatpickr @react-jvectormap/core @react-jvectormap/world"
echo "npm uninstall @fullcalendar/core @fullcalendar/daygrid @fullcalendar/interaction @fullcalendar/react @fullcalendar/timegrid @fullcalendar/list"