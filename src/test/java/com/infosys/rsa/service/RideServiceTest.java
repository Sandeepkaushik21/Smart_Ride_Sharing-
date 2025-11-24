import com.infosys.rsa.dto.RidePostRequest;
import com.infosys.rsa.dto.RideRescheduleRequest;
import com.infosys.rsa.dto.RideSearchRequest;
import com.infosys.rsa.model.*;
import com.infosys.rsa.repository.BookingRepository;
import com.infosys.rsa.repository.RideRepository;
import com.infosys.rsa.repository.UserRepository;
import com.infosys.rsa.service.EmailService;
import com.infosys.rsa.service.FareCalculationService;
import com.infosys.rsa.service.RideService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RideServiceTest {

    @Mock
    private RideRepository rideRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private FareCalculationService fareCalculationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private RideService rideService;

    private User driver;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);

        driver = new User();
        driver.setId(1L);
        driver.setEmail("driver@mail.com");
        driver.setName("John Driver");
        driver.setIsApproved(true);
    }

    // -----------------------------------------------------
    // BASIC TEST: postRide()
    // -----------------------------------------------------
    @Test
    void testPostRide_Success() {
        RidePostRequest req = new RidePostRequest();
        req.setCitySource("Chennai");
        req.setCityDestination("Bengaluru");
        req.setSource("Anna Nagar");
        req.setDestination("Koramangala");
        req.setPickupLocations(List.of("a","b","c","d"));
        req.setDropLocations(List.of("p","q","r","s"));
        req.setDate(LocalDate.now());
        req.setTime(LocalTime.NOON);
        req.setAvailableSeats(3);
        req.setVehicleModel("Honda City");

        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));
        when(fareCalculationService.calculateDistance(any(), any())).thenReturn(10.0);
        when(fareCalculationService.calculateFare(10.0)).thenReturn(100.0);
        when(rideRepository.save(any(Ride.class)))
                .thenAnswer(inv -> {
                    Ride r = inv.getArgument(0);
                    r.setId(99L);
                    return r;
                });

        Ride saved = rideService.postRide(1L, req);

        assertNotNull(saved);
        assertEquals(99L, saved.getId());
        assertEquals("Chennai", saved.getCitySource());
        assertEquals(10.0, saved.getTotalDistance());
        assertEquals(100.0, saved.getEstimatedFare());
    }

    // -----------------------------------------------------
    // postRide() NEGATIVE CASES
    // -----------------------------------------------------

    @Test
    void testPostRide_DriverNotFound_ShouldThrow() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        RidePostRequest req = new RidePostRequest();
        req.setCitySource("Chennai");
        req.setCityDestination("BLR");
        req.setSource("A");
        req.setDestination("B");
        req.setPickupLocations(List.of("a","b","c","d"));
        req.setDropLocations(List.of("p","q","r","s"));
        req.setDate(LocalDate.now());
        req.setTime(LocalTime.NOON);
        req.setAvailableSeats(3);

        assertThrows(RuntimeException.class,
                () -> rideService.postRide(1L, req));
    }

    @Test
    void testPostRide_DriverNotApproved_ShouldThrow() {
        User unapproved = new User();
        unapproved.setId(1L);
        unapproved.setIsApproved(false);

        when(userRepository.findById(1L)).thenReturn(Optional.of(unapproved));

        RidePostRequest req = new RidePostRequest();
        req.setCitySource("Chennai");
        req.setCityDestination("BLR");
        req.setSource("A");
        req.setDestination("B");
        req.setPickupLocations(List.of("a","b","c","d"));
        req.setDropLocations(List.of("p","q","r","s"));
        req.setDate(LocalDate.now());
        req.setTime(LocalTime.NOON);
        req.setAvailableSeats(3);

        assertThrows(RuntimeException.class,
                () -> rideService.postRide(1L, req));
    }

    @Test
    void testPostRide_NoVehiclePhotos_ShouldStillWork() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));
        when(fareCalculationService.calculateDistance(any(), any())).thenReturn(5.0);
        when(fareCalculationService.calculateFare(5.0)).thenReturn(50.0);
        when(rideRepository.save(any(Ride.class))).thenAnswer(inv -> {
            Ride r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        RidePostRequest req = new RidePostRequest();
        req.setCitySource("CityA");
        req.setCityDestination("CityB");
        req.setSource("A");
        req.setDestination("B");
        req.setPickupLocations(List.of("a","b","c","d"));
        req.setDropLocations(List.of("x","y","z","w"));
        req.setDate(LocalDate.now());
        req.setTime(LocalTime.NOON);
        req.setAvailableSeats(2);

        Ride ride = rideService.postRide(1L, req);

        assertNotNull(ride);
        assertEquals(100L, ride.getId());
    }

    // -----------------------------------------------------
    // searchRides()
    // -----------------------------------------------------
    @Test
    void testSearchRides_Basic() {
        Ride sampleRide = new Ride();
        sampleRide.setId(50L);
        sampleRide.setDriver(driver);
        sampleRide.setEstimatedFare(200.0);

        RideSearchRequest req = new RideSearchRequest();
        req.setSource("Chennai");
        req.setDestination("BLR");
        req.setDate(LocalDate.now());

        when(rideRepository.searchRides(any(), any(), any()))
                .thenReturn(List.of(sampleRide));

        List<Ride> rides = rideService.searchRides(req);

        assertEquals(1, rides.size());
        assertEquals(50L, rides.get(0).getId());
    }

    @Test
    void testSearchRides_MinPriceFilter() {
        Ride r1 = new Ride();
        r1.setEstimatedFare(50.0);
        r1.setDriver(driver);

        Ride r2 = new Ride();
        r2.setEstimatedFare(200.0);
        r2.setDriver(driver);

        when(rideRepository.searchRides(any(), any(), any()))
                .thenReturn(List.of(r1, r2));

        RideSearchRequest req = new RideSearchRequest();
        req.setMinPrice(100.0);

        List<Ride> result = rideService.searchRides(req);

        assertEquals(1, result.size());
        assertEquals(200.0, result.get(0).getEstimatedFare());
    }

    @Test
    void testSearchRides_MinRatingFilter() {
        User d1 = new User();
        d1.setDriverRating(5.0);

        User d2 = new User();
        d2.setDriverRating(2.0);

        Ride r1 = new Ride();
        r1.setDriver(d1);

        Ride r2 = new Ride();
        r2.setDriver(d2);

        when(rideRepository.searchRides(any(), any(), any()))
                .thenReturn(List.of(r1, r2));

        RideSearchRequest req = new RideSearchRequest();
        req.setMinRating(4);

        List<Ride> result = rideService.searchRides(req);

        assertEquals(1, result.size());
        assertEquals(5.0, result.get(0).getDriver().getDriverRating());
    }

    // -----------------------------------------------------
    // getRideById()
    // -----------------------------------------------------
    @Test
    void testGetRideById_Success() {
        Ride ride = new Ride();
        ride.setId(5L);

        when(rideRepository.findById(5L)).thenReturn(Optional.of(ride));

        Ride result = rideService.getRideById(5L);
        assertEquals(5L, result.getId());
    }

    @Test
    void testGetRideById_NotFound() {
        when(rideRepository.findById(200L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> rideService.getRideById(200L));
    }

    // -----------------------------------------------------
    // getRidesByDriver()
    // -----------------------------------------------------
    @Test
    void testGetRidesByDriver() {
        Ride r = new Ride();
        r.setId(10L);

        when(rideRepository.findByDriverId(1L)).thenReturn(List.of(r));

        List<Ride> rides = rideService.getRidesByDriver(1L);
        assertEquals(1, rides.size());
        assertEquals(10L, rides.get(0).getId());
    }

    // -----------------------------------------------------
    // rescheduleRide()
    // -----------------------------------------------------
    @Test
    void testRescheduleRide_Success() {
        Ride ride = new Ride();
        ride.setId(55L);
        ride.setDriver(driver);
        ride.setDate(LocalDate.now());
        ride.setTime(LocalTime.NOON);
        ride.setStatus(Ride.RideStatus.SCHEDULED);

        RideRescheduleRequest req = new RideRescheduleRequest();
        req.setNewDate(LocalDate.now().plusDays(1));
        req.setNewTime(LocalTime.of(14, 0));

        when(rideRepository.findById(55L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findByRideId(55L)).thenReturn(Collections.emptyList());
        when(rideRepository.save(any(Ride.class))).thenAnswer(inv -> inv.getArgument(0));

        Ride updated = rideService.rescheduleRide(1L, 55L, req);

        assertEquals(req.getNewDate(), updated.getDate());
        assertEquals(req.getNewTime(), updated.getTime());
    }

    @Test
    void testRescheduleRide_OtherDriver_ShouldThrow() {
        User otherDriver = new User();
        otherDriver.setId(999L);

        Ride ride = new Ride();
        ride.setId(30L);
        ride.setDriver(otherDriver);
        ride.setStatus(Ride.RideStatus.SCHEDULED);

        RideRescheduleRequest req = new RideRescheduleRequest();
        req.setNewDate(LocalDate.now());
        req.setNewTime(LocalTime.NOON);

        when(rideRepository.findById(30L)).thenReturn(Optional.of(ride));

        assertThrows(RuntimeException.class,
                () -> rideService.rescheduleRide(1L, 30L, req));
    }

    @Test
    void testRescheduleRide_CancelledRide_ShouldThrow() {
        Ride ride = new Ride();
        ride.setDriver(driver);
        ride.setStatus(Ride.RideStatus.CANCELLED);

        RideRescheduleRequest req = new RideRescheduleRequest();
        req.setNewDate(LocalDate.now());
        req.setNewTime(LocalTime.NOON);

        when(rideRepository.findById(5L)).thenReturn(Optional.of(ride));

        assertThrows(RuntimeException.class,
                () -> rideService.rescheduleRide(1L, 5L, req));
    }

    @Test
    void testRescheduleRide_WithConfirmedBookings_ShouldUpdateStatus() {
        Ride ride = new Ride();
        ride.setId(101L);
        ride.setDriver(driver);
        ride.setStatus(Ride.RideStatus.SCHEDULED);

        Booking booking = new Booking();
        booking.setStatus(Booking.BookingStatus.CONFIRMED);

        RideRescheduleRequest req = new RideRescheduleRequest();
        req.setNewDate(LocalDate.now());
        req.setNewTime(LocalTime.NOON);

        when(rideRepository.findById(101L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findByRideId(101L)).thenReturn(List.of(booking));
        when(rideRepository.save(any(Ride.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        Ride updated = rideService.rescheduleRide(1L, 101L, req);

        assertEquals(Booking.BookingStatus.RESCHEDULED, booking.getStatus());
        assertEquals(req.getNewDate(), updated.getDate());
    }
}
