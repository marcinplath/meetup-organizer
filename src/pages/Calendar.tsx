import React, { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  useColorModeValue,
  Tooltip,
  Container,
} from '@chakra-ui/react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import plLocale from '@fullcalendar/core/locales/pl'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format, addDays, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns'
import styled from '@emotion/styled'

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  end_time?: string;
  has_end_time?: boolean;
  created_by: string;
  is_recurring?: boolean;
  weekday?: number;
  event_participants?: { user_id: string }[];
  color?: string;
  type?: 'owned' | 'participating' | 'other';
}

const StyledCalendarWrapper = styled(Box)`
  .fc-col-header-cell {
    background-color: ${(props: any) => props.theme.colors?.headerBg};
  }
  .fc-col-header-cell-cushion {
    color: ${(props: any) => props.theme.colors?.headerText};
  }

  // Style dla przycisków
  .fc-button-primary {
    background-color: ${(props: any) => props.theme.colors?.buttonBg} !important;
    border-color: ${(props: any) => props.theme.colors?.buttonBorder} !important;
    color: ${(props: any) => props.theme.colors?.buttonText} !important;
  }

  .fc-button-primary:not(:disabled):hover {
    background-color: ${(props: any) => props.theme.colors?.buttonHoverBg} !important;
    border-color: ${(props: any) => props.theme.colors?.buttonHoverBorder} !important;
  }

  .fc-button-primary:disabled {
    opacity: 0.65;
  }

  .fc-button-active {
    background-color: ${(props: any) => props.theme.colors?.buttonActiveBg} !important;
    border-color: ${(props: any) => props.theme.colors?.buttonActiveBorder} !important;
  }

  .fc-today-button {
    text-transform: capitalize;
  }

  // Responsywne style dla mobile
  @media (max-width: 768px) {
    .fc {
      font-size: 0.9em;
    }

    .fc .fc-toolbar {
      flex-direction: column;
      gap: 1rem;
    }

    .fc .fc-toolbar-title {
      font-size: 1.2em;
      margin: 0;
    }

    .fc-header-toolbar {
      margin-bottom: 1rem !important;
      padding: 0 0.5rem;
    }

    .fc-toolbar-chunk {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    .fc-button {
      padding: 0.5rem 0.8rem !important;
      font-size: 0.9rem !important;
    }

    .fc-day-header {
      padding: 0.5rem 0 !important;
    }

    .fc-daygrid-day-number {
      padding: 0.3rem !important;
    }

    // Popraw wyświetlanie nazw dni tygodnia
    .fc-col-header-cell-cushion {
      padding: 0.5rem 0;
      font-weight: 600;
    }

    // Dostosuj wielkość komórek
    .fc-daygrid-day {
      min-height: 2rem !important;
    }

    // Popraw wyświetlanie wydarzeń
    .fc-event {
      margin: 1px 0;
      padding: 2px;
    }

    .fc-event-title {
      font-size: 0.8em;
    }

    .fc-event-time {
      font-size: 0.75em;
    }
  }
`

const CalendarSection = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState<any[]>([])
  const [viewDates, setViewDates] = useState({ start: new Date(), end: new Date() })
  const { user } = useAuth()
  const participatingColor = useColorModeValue('#4299E1', '#63B3ED')
  const ownedColor = useColorModeValue('#48BB78', '#68D391')
  const otherEventsColor = useColorModeValue('#A0AEC0', '#718096')
  const hoverBgColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const bgColor = useColorModeValue('white', 'gray.700')
  const textColor = useColorModeValue('gray.700', 'white')
  const dayNumberColor = useColorModeValue('gray.700', 'gray.100')

  const theme = {
    colors: {
      headerBg: useColorModeValue('#F7FAFC', '#2D3748'),
      headerText: useColorModeValue('#2D3748', '#FFFFFF'),
      buttonBg: useColorModeValue('#EDF2F7', '#2D3748'),
      buttonBorder: useColorModeValue('#E2E8F0', '#4A5568'),
      buttonText: useColorModeValue('#1A202C', '#FFFFFF'),
      buttonHoverBg: useColorModeValue('#E2E8F0', '#4A5568'),
      buttonHoverBorder: useColorModeValue('#CBD5E0', '#718096'),
      buttonActiveBg: useColorModeValue('#3182CE', '#4299E1'),
      buttonActiveBorder: useColorModeValue('#2B6CB0', '#3182CE')
    }
  }

  const generateRecurringEvents = (event: Event, viewStart: Date, viewEnd: Date) => {
    const formattedEvents = [];
    let uniqueIdCounter = 1;
    const startDate = parseISO(event.date);
    
    // Iteruj przez wszystkie dni w zakresie widoku
    let currentDate = startOfMonth(viewStart);
    const endDate = endOfMonth(viewEnd);
    
    while (currentDate <= endDate) {
      // Jeśli bieżący dzień to właściwy dzień tygodnia i nie jest wcześniejszy niż data początkowa
      if (currentDate.getDay() === event.weekday && currentDate >= startDate) {
        // Wyciągnij tylko datę bez czasu
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Utwórz odpowiednie stringi daty i czasu
        const startTimeStr = `${dateStr}T${event.time}`;
        let endTimeStr = null;
        
        if (event.has_end_time && event.end_time) {
          endTimeStr = `${dateStr}T${event.end_time}`;
        }
        
        formattedEvents.push({
          id: `${event.id}_${uniqueIdCounter++}`,
          title: `${event.title} (cykliczne)`,
          start: startTimeStr,
          end: endTimeStr,
          backgroundColor: event.color,
          borderColor: event.color,
          extendedProps: {
            type: event.type,
            originalId: event.id
          }
        });
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return formattedEvents;
  };

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      try {
        const { data: allEvents, error: eventsError } = await supabase
          .from('events')
          .select(`
            id,
            title,
            date,
            time,
            end_time,
            has_end_time,
            created_by,
            is_recurring,
            weekday,
            event_participants (
              user_id
            )
          `);

        if (eventsError) throw eventsError;
        
        const formattedEvents = [];

        for (const event of allEvents as Event[]) {
          const isOwner = event.created_by === user.id;
          const isParticipant = event.event_participants?.some(p => p.user_id === user.id);
          const eventColor = isOwner ? ownedColor : (isParticipant ? participatingColor : otherEventsColor);
          
          if (event.is_recurring && event.weekday !== null) {
            // Dla wydarzeń cyklicznych generuj wydarzenia w zakresie widoku
            const recurringEvents = generateRecurringEvents({
              ...event,
              color: eventColor,
              type: isOwner ? 'owned' : (isParticipant ? 'participating' : 'other')
            }, viewDates.start, viewDates.end);
            formattedEvents.push(...recurringEvents);
          } else {
            // Dla wydarzeń jednorazowych
            const dateStr = event.date;
            const startTimeStr = `${dateStr}T${event.time}`;
            let endTimeStr = null;
            
            if (event.has_end_time && event.end_time) {
              endTimeStr = `${dateStr}T${event.end_time}`;
            }

            formattedEvents.push({
              id: event.id,
              title: event.title,
              start: startTimeStr,
              end: endTimeStr,
              backgroundColor: eventColor,
              borderColor: eventColor,
              extendedProps: {
                type: isOwner ? 'owned' : (isParticipant ? 'participating' : 'other')
              }
            });
          }
        }

        setEvents(formattedEvents);
      } catch (error) {
        console.error('Błąd podczas pobierania wydarzeń:', error);
      }
    };

    fetchEvents();
  }, [user, ownedColor, participatingColor, otherEventsColor, viewDates]);

  const handleEventClick = (info: any) => {
    // Dla wydarzeń cyklicznych, pobierz oryginalny ID
    const eventId = info.event.extendedProps.originalId || info.event.id;
    navigate(`/events/${eventId}`);
  }

  const handleDatesSet = (arg: any) => {
    setViewDates({ start: arg.start, end: arg.end });
  }

  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const renderEventContent = (arg: any) => {
    const timeText = arg.event.start ? 
      format(arg.event.start, 'HH:mm') + 
      (arg.event.end ? ` - ${format(arg.event.end, 'HH:mm')}` : '') : ''

    return (
      <Tooltip 
        label={
          <VStack align="start" spacing={1} p={1}>
            <Text fontWeight="bold">{arg.event.title}</Text>
            <Text fontSize="sm">{timeText}</Text>
          </VStack>
        }
        hasArrow
        placement="top"
      >
        <Box 
          p={1} 
          w="100%" 
          overflow="hidden"
          _hover={{ 
            bg: hoverBgColor,
            cursor: 'pointer'
          }}
        >
          <Text 
            fontSize="sm" 
            fontWeight="bold" 
            noOfLines={1}
          >
            {truncateText(arg.event.title)}
          </Text>
          <Text 
            fontSize="xs" 
            noOfLines={1}
          >
            {timeText}
          </Text>
        </Box>
      </Tooltip>
    )
  }

  const renderDayCellContent = (arg: any) => {
    return (
      <Box 
        position="relative"
        fontSize="sm"
        p={2}
        color={dayNumberColor}
        fontWeight="medium"
      >
        {arg.dayNumberText}
      </Box>
    )
  }

  const renderDayHeaderContent = (arg: any) => {
    return (
      <Text
        fontSize="sm"
        fontWeight="semibold"
        color={textColor}
        py={2}
      >
        {arg.text}
      </Text>
    )
  }

  return (
    <Box width="100%">
      <Heading size="md" mb={4}>Kalendarz wydarzeń</Heading>
      <StyledCalendarWrapper 
        theme={theme}
        bg={bgColor} 
        p={{ base: 2, md: 4 }} 
        borderRadius="lg" 
        boxShadow="sm"
        width="100%"
        overflow="hidden"
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={plLocale}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          eventDisplay="block"
          displayEventEnd={true}
          eventContent={renderEventContent}
          eventDidMount={(info) => {
            info.el.style.margin = '1px'
            info.el.style.borderRadius = '4px'
          }}
          dayCellContent={renderDayCellContent}
          dayHeaderContent={renderDayHeaderContent}
          views={{
            dayGridMonth: {
              dayMaxEventRows: 2,
              dayMaxEvents: true
            }
          }}
        />
      </StyledCalendarWrapper>
      <HStack spacing={4} mt={4} justify="center" flexWrap="wrap" px={2}>
        <HStack>
          <Box w={4} h={4} bg={ownedColor} borderRadius="md" />
          <Text fontSize={{ base: "xs", md: "sm" }}>Moje wydarzenia</Text>
        </HStack>
        <HStack>
          <Box w={4} h={4} bg={participatingColor} borderRadius="md" />
          <Text fontSize={{ base: "xs", md: "sm" }}>Wydarzenia w których uczestniczę</Text>
        </HStack>
        <HStack>
          <Box w={4} h={4} bg={otherEventsColor} borderRadius="md" />
          <Text fontSize={{ base: "xs", md: "sm" }}>Pozostałe wydarzenia</Text>
        </HStack>
      </HStack>
    </Box>
  )
}

const Calendar = () => {
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Kalendarz</Heading>
        <Text color="gray.600">Przegląd nadchodzących wydarzeń</Text>
      </Box>

      <CalendarSection />
    </VStack>
  )
}

export default Calendar
